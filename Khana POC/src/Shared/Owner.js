import React, { Component } from 'react'
import Audit from './Audit'
import { LogTypes, checkForOldSession } from '../utils/helpers'
import { Pane, TextInputField, Heading, Button, FilePicker } from 'evergreen-ui'

export default class Owner extends Component {
    
    khanaTokenInstance = this.props.state.contract.instance

    refreshIfNeeded = async () => {
        await checkForOldSession(this.props.state.app.lastLoadTimestamp, this.props.updateState)
    }

    // Any admin can still burng tokens based on smart contract. We just put the UX
    // here for now...
    burnTokens = async (event) => {
        event.preventDefault()
        document.getElementById("burnTokens").disabled = true

        let web3 = this.props.state.web3

        // Set variables
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value

        await this.refreshIfNeeded()

        // Record the award details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordBurn(timeStamp, address, amount, reason)
        this.props.updateLoadingMessage('Burn added to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.burn(address, amount, ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let burnEvent = khanaTokenInstance.LogBurned({ fromBlock: 'latest' }, (err, response) => {

                // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    let message = "Transaction confirmed and tokens burned."
                    auditInstance.finaliseTx(response, ipfsHash, LogTypes.burn, message)
                    burnEvent.stopWatching()
                    document.getElementById("burnTokens").disabled = false
                }
            })
        }).catch((error) => {
            this.props.updateState('Burning error', error.message, 3)
            document.getElementById("burnTokens").disabled = false;
        })
    }

    parseFile = async (file) => {
        let result = await this._parseFilePromise(file)
        this.setState({ oldTokenJson: JSON.parse(result) })
    }

    _parseFilePromise = (file) => {
        let reader = new FileReader()
        reader.readAsText(file)
        return new Promise(resolve => {
            reader.onload = function(evt) {
                resolve(reader.result)
            }
        })
    }

    performTokenMigration = async (event) => {
        event.preventDefault()
        document.getElementById("performTokenMigration").disabled = true

        let oldContractAddress = event.target.oldContract.value
        let previousIpfsHash = event.target.ipfsHash.value
        let reason = event.target.reason.value

        await this.refreshIfNeeded()

        let newState = this.props.state
        newState.contract.latestIpfsHash = previousIpfsHash

        let web3 = this.props.state.web3
        let oldTokenInstance = await this._getOldTokenContract()
        let toAddresses = await this._getRecieversFromTransferEvents(oldTokenInstance)
        let balances = await this._getTokenBalances(oldTokenInstance, toAddresses)

        // Record the migration details on IPFS audit log
    
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.migrateTokenBalances(timeStamp, oldContractAddress, previousIpfsHash, reason)
        this.props.updateLoadingMessage('Migration recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.migrateBalancesFromOldContract(oldContractAddress, toAddresses, balances, ipfsHash, timeStamp, { from: accounts[0], gas: 500000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let migrationEvent = khanaTokenInstance.LogTokenMigration({ fromBlock: 'latest' }, (err, response) => {
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    let message = "Transaction confirmed and tokens migration successful."
                    auditInstance.finaliseTx(response, ipfsHash, LogTypes.tokenMigration, message)
                    migrationEvent.stopWatching()
                    document.getElementById("performTokenMigration").disabled = false
                }
            })

            let migrationAwardFailures = khanaTokenInstance.LogBulkAwardedFailure({ fromBlock: 'latest' }, (err, response) => {
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    console.log(response)
                    migrationAwardFailures.stopWatching()
                }
            })

        }).catch((error) => {
            this.props.updateState('Token migration error', error.message, 3)
            document.getElementById("performTokenMigration").disabled = false;
        })
    }

    _getOldTokenContract = () => {
        this.props.updateLoadingMessage('Getting old token information', '', 0)

        let oldTokenJson = this.state.oldTokenJson

        // Set up old contract
        const contract = require('truffle-contract')
        let oldTokenContract = contract(oldTokenJson)
        oldTokenContract.setProvider(this.props.state.web3.currentProvider)

        return new Promise(resolve => {
            oldTokenContract.deployed().then(oldTokenInstance => {
                resolve(oldTokenInstance)
            })
        })
    }

    _getRecieversFromTransferEvents = (oldTokenInstance) => {
        this.props.updateLoadingMessage('Getting old token information', 'Getting all previous receive transfers...', 0)
        let eventParams = {
            fromBlock: this.props.state.contract.startingBlock,
            toBlock: 'latest'
        }

        let transferEvents = oldTokenInstance.Transfer({}, eventParams)

        return new Promise((resolve, reject) => {
            transferEvents.get((err, result) => {
                if (err) { reject(err) }
                
                let toAddresses = [...new 
                    Set(
                        result.filter(log => {
                        return log.args.to !== "0x0000000000000000000000000000000000000000"
                    })
                        .map(validLog => {
                        return validLog.args.to
                    })
                )]

                transferEvents.stopWatching()
                resolve(toAddresses)
            })
        })
    }

    _getTokenBalances = (oldTokenInstance, addresses) => {
        this.props.updateLoadingMessage('Getting old token information', 'Getting all previous token balances...', 0)
        return new Promise(resolve => {
            let balances = addresses.map(address => {
                let balance = oldTokenInstance.balanceOf(address)
                .then(bal => { return bal.toString() })
                return balance
            })

            Promise.all(balances)
            .then((values) => { resolve(values) })
        })
    }

    render() {

        return (
            <Pane padding={8} flex="1">

                {/* Burn tokens */}

                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Burn tokens belonging to community members</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.burnTokens} id="burnTokens">
                            <TextInputField
                                label="Member's address"
                                placeholder="0x...."
                                htmlFor="burnTokens"
                                type="text"
                                name="address"
                                required
                            />
                            <TextInputField
                                label={"Amount of " + this.props.state.contract.tokenSymbol}
                                placeholder="0.0"
                                htmlFor="burnTokens"
                                type="number"
                                name="amount"
                                required
                            />
                            <TextInputField
                                label="Reason for burning"
                                placeholder="..."
                                htmlFor="burnTokens"
                                type="text"
                                name="reason"
                                required
                            />
                            <Button type="submit" id="burnTokens" marginLeft={8}>Burn</Button>
                        </form>
                    </Pane>
                </Pane>

                {/* Token Migration */}

                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Perform token migration to new contract</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.performTokenMigration} id="performTokenMigration">
                            <FilePicker
                                required
                                name="filePicker"
                                width={250}
                                marginBottom={24}
                                onChange={files => this.parseFile(files[0])}
                            />

                            <TextInputField
                                label="Address of the old token contract on Rinkeby"
                                placeholder="0x..."
                                htmlFor="performTokenMigration"
                                type="text"
                                name="oldContract"
                                required
                            />

                            <TextInputField
                                label="Latest IPFS hash for old contract audits"
                                placeholder="..."
                                htmlFor="performTokenMigration"
                                type="text"
                                name="ipfsHash"
                                required
                            />

                            <TextInputField
                                label="Reason and details for migration"
                                placeholder="..."
                                htmlFor="performTokenMigration"
                                type="text"
                                name="reason"
                                required
                            />
                            <Button type="submit" id="performTokenMigration" marginLeft={8}>Perform migration</Button>
                        </form>
                    </Pane>
                </Pane>
            </Pane>
        )
    }
}