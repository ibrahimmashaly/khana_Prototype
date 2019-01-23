import React, { Component } from 'react'
import Audit from './Audit'
import { LogTypes, checkForOldSession } from '../utils/helpers'
import { Pane, TextInputField, Heading, Text, Button, FilePicker } from 'evergreen-ui'

export default class Owner extends Component {

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

    updateOldIpfsFile = async (event) => {
        event.preventDefault()

        let auditInstance = new Audit(this.props)
        let newAuditIpfsHash = await auditInstance.tempRecordAwards(event.target.ipfsHash.value)
        console.log(newAuditIpfsHash)
        return

    }

    performMigration = async (event) => {
        event.preventDefault()

        if (this.props.state.contract.totalSupply > 0) {
            this.props.createNotification('Error!', "Migration is only possible for brand new contract deployments. I.e. zero token supply.", 2);
            return
        }

        document.getElementById("performMigration").disabled = true

        let web3 = this.props.state.web3

        let oldContractVersion = web3.toWei(event.target.oldVersion.value, 'ether')
        let previousIpfsHash = event.target.ipfsHash.value
        let reason = event.target.reason.value

        await this.refreshIfNeeded()

        let newState = this.props.state
        newState.contract.latestIpfsHash = previousIpfsHash

        let timeStamp = Date.now()
        let blockNumber = await this._getBlockNumber()
        let oldTokenInstance = await this._getOldTokenContract()
        let oldContractAddress = this.state.oldTokenAddress

        let params = {
            "web3": web3,
            "oldContractVersion": oldContractVersion, 
            "previousIpfsHash": previousIpfsHash, 
            "reason": reason, 
            "timeStamp": timeStamp, 
            "blockNumber": blockNumber, 
            "oldTokenInstance": oldTokenInstance, 
            "oldContractAddress": oldContractAddress
        }

        let newIpfsHash = await this._performAdminMigration(params)

        params.previousIpfsHash = newIpfsHash

        await this._performTokenMigration(params)

        document.getElementById("performMigration").disabled = false
        this.props.createNotification('Migration complete!', "Admins and token balances have been migrated.", 1);
    }

    _performAdminMigration = async (params) => {

        let adminAddAddresses
        if (Number(params.oldContractVersion) >= 0.2) {
            let bulkAdminAdds = await this._getAdminsFromAdminEvents(true, params.oldTokenInstance, true)
            adminAddAddresses = await this._getAdminsFromAdminEvents(true, params.oldTokenInstance)
            adminAddAddresses = adminAddAddresses.concat(bulkAdminAdds)
        } else {
            adminAddAddresses = await this._getAdminsFromAdminEvents(true, params.oldTokenInstance)
        }
        let adminRemoveAddresses = await this._getAdminsFromAdminEvents(false, params.oldTokenInstance)
        let adminAddresses = [...new Set(
            adminAddAddresses.filter(x => !(new Set(adminRemoveAddresses).has(x)))
        )]

        // Record the migration details on IPFS audit log

        let auditInstance = new Audit(this.props)
        let ipfsHash = await auditInstance.migrateAdminAccounts(params.timeStamp, params.oldContractAddress, params.oldContractVersion, params.previousIpfsHash, params.reason, params.blockNumber)
        this.props.updateLoadingMessage('Admin migration recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        return new Promise((resolve, reject) => {
            khanaTokenInstance.bulkAddAdmin(params.oldContractAddress, params.oldContractVersion, adminAddresses, ipfsHash, params.timeStamp, { from: accounts[0], gas: 500000, gasPrice: params.web3.toWei(5, 'gwei') }).then((txResult) => {

                this.props.updateLoadingMessage('Waiting for transaction to confirm...')

                let migrationEvent = khanaTokenInstance.LogBulkAdminAdded({ fromBlock: 'latest' }, (err, response) => {
                    if (response.blockNumber >= txResult.receipt.blockNumber) {
                        let message = "Admin migration successful."
                        auditInstance.finaliseTx(response, ipfsHash, LogTypes.tokenMigration, message)
                        migrationEvent.stopWatching()
                        resolve(ipfsHash)
                    }
                })
            }).catch((error) => {
                reject(error)
                this.props.updateState('Admin migration error', error.message, 3)
            })
        })
        
    }

    _performTokenMigration = async (params) => {
        let toAddresses = await this._getRecieversFromTransferEvents(params.oldTokenInstance)
        let balances = await this._getTokenBalances(params.oldTokenInstance, toAddresses)

        // Record the migration details on IPFS audit log
    
        let auditInstance = new Audit(this.props)
        let ipfsHash = await auditInstance.migrateTokenBalances(params.timeStamp, params.oldContractAddress, params.oldContractVersion, params.previousIpfsHash, params.reason, params.blockNumber)
        this.props.updateLoadingMessage('Token migration recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        return new Promise((resolve, reject) => {
            khanaTokenInstance.migrateBalancesFromOldContract(params.oldContractAddress, params.oldContractVersion, toAddresses, balances, ipfsHash, params.timeStamp, { from: accounts[0], gas: 500000, gasPrice: params.web3.toWei(5, 'gwei') }).then((txResult) => {

                this.props.updateLoadingMessage('Waiting for transaction to confirm...')

                let migrationEvent = khanaTokenInstance.LogTokenMigration({ fromBlock: 'latest' }, (err, response) => {
                    if (response.blockNumber >= txResult.receipt.blockNumber) {
                        let message = "Tokens migration successful."
                        auditInstance.finaliseTx(response, ipfsHash, LogTypes.tokenMigration, message)
                        migrationEvent.stopWatching()
                        resolve()
                    }
                })

                let migrationAwardFailures = khanaTokenInstance.LogBulkAwardedFailure({ fromBlock: 'latest' }, (err, response) => {
                    if (response.blockNumber >= txResult.receipt.blockNumber) {
                        console.log(response)
                        migrationAwardFailures.stopWatching()
                    }
                })

            }).catch((error) => {
                reject(error)
                this.props.updateState('Token migration error', error.message, 3)
            })
        })
    }

    _getBlockNumber = () => {
        return new Promise((resolve, reject) => {
            let web3 = this.props.state.web3
            web3.eth.getBlockNumber((error, result) => {
                if (error) { reject(error) }
                resolve(result)
            })
        })
    }

    _getOldTokenContract = () => {
        this.props.updateLoadingMessage('Getting old token information', '', 0)
        let web3 = this.props.state.web3
        let oldTokenJson = this.state.oldTokenJson

        // Set up old contract
        const contract = require('truffle-contract')
        let oldTokenContract = contract(oldTokenJson)
        oldTokenContract.setProvider(web3.currentProvider)

        return new Promise(resolve => {
            oldTokenContract.deployed().then(oldTokenInstance => {
                console.log(oldTokenContract.address)
                this.setState({oldTokenAddress: oldTokenContract.address})
                resolve(oldTokenInstance)
            })
        })
    }

    _getAdminsFromAdminEvents = (isAdded, oldTokenInstance, checkBulkAdd) => {
        this.props.updateLoadingMessage('Getting old token information', 'Getting previously ' + (isAdded ? 'added' : 'removed') +  ' admins...', 0)
        let eventParams = {
            fromBlock: this.props.state.contract.startingBlock,
            toBlock: 'latest'
        }

        let adminEvent
        if (isAdded) {
                adminEvent = checkBulkAdd ? 
                            oldTokenInstance.LogBulkAdminAdded({}, eventParams) : 
                            oldTokenInstance.LogAdminAdded({}, eventParams)
        } else {
            adminEvent = oldTokenInstance.LogAdminRemoved({}, eventParams)
        }
 
        return new Promise((resolve, reject) => {
            adminEvent.get((err, result) => {
                if (err) { reject(err) }

                let adminAddresses
                if (checkBulkAdd && result.length > 0) {
                    console.log(result)
                    adminAddresses = result[0].args.accounts
                } else {
                    adminAddresses = [...new
                        Set(
                            result.map(log => {
                                return log.args.account
                            })
                        )]
                }
                adminEvent.stopWatching()
                resolve(adminAddresses)
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

    destroy = (event) => {
        event.preventDefault()
        
        let alert = confirm("Are you sure?")
        if (alert === true) {

            let khanaTokenInstance = this.props.state.contract.instance
            let accounts = this.props.state.user.accounts

            khanaTokenInstance.destroy({ from: accounts[0], gas: 500000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((txResult) => {
                console.log(txResult)
            })
        }
    }

    render() {

        return (
            <Pane padding={8} flex="1">

                {/* Burn tokens */}

                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Burn tokens belonging to community members</Heading>
                    </Pane>
                    <FilePicker
                        required
                        name="filePicker"
                        width={250}
                        marginBottom={24}
                        onChange={files => this.parseFile(files[0])}
                    />
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
                                type="text"
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

                {/* v.0.0 JSON upgrade */}
                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Temp upgrade</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.updateOldIpfsFile} id="updateOldIpfsFile">
                            <TextInputField
                                label="Latest IPFS hash for old contract audits"
                                placeholder="..."
                                htmlFor="updateOldIpfsFile"
                                type="text"
                                name="ipfsHash"
                                required
                            />
                            <Button type="submit" id="updateOldIpfsFile" marginLeft={8}>updateOldIpfsFile</Button>
                        </form>
                    </Pane>
                </Pane>

                {/* Admin Migration */}

                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Perform migration to new contract</Heading>
                        <Text>Two transactions will be required, one for migrating admins, the other for migrating token balances</Text>
                        <p></p>
                        <FilePicker
                            required
                            name="filePicker"
                            width={250}
                            marginBottom={24}
                            onChange={files => this.parseFile(files[0])}
                        />

                        <Pane marginBottom={16}>
                            <form onSubmit={this.performMigration} id="performMigration">

                                <TextInputField
                                    label="Version of the old token contract"
                                    placeholder="0.1"
                                    htmlFor="performMigration"
                                    type="text"
                                    name="oldVersion"
                                    required
                                />

                                <TextInputField
                                    label="Latest IPFS hash for old contract audits"
                                    placeholder="..."
                                    htmlFor="performMigration"
                                    type="text"
                                    name="ipfsHash"
                                    required
                                />

                                <TextInputField
                                    label="Reason and details for migration"
                                    placeholder="..."
                                    htmlFor="performMigration"
                                    type="text"
                                    name="reason"
                                    required
                                />
                                <Button type="submit" id="performMigration" marginLeft={8}>Perform migration</Button>
                            </form>
                        </Pane>
                    </Pane>
                </Pane>

                {/* Self destruct */}
                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Self destruct</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.destroy} id="destroy">
                            <TextInputField
                                label="Address of contract"
                                placeholder="..."
                                htmlFor="destroy"
                                type="text"
                                name="address"
                                required
                            />
                            <Button type="submit" id="destroy" marginLeft={8}>destroy</Button>
                        </form>
                    </Pane>
                </Pane>
            </Pane>
        )
    }
}