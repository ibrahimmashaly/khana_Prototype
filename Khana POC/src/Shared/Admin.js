import React, { Component } from 'react'
import Audit from './Audit'
import { LogTypes } from '../utils/helpers';


import { Pane, Text, TextInputField, Heading, Button } from 'evergreen-ui'

class Admin extends Component {

    // Used to finalise each transaction that should be properly recorded on the audit logs
    finaliseTx = async (response, ipfsHash, type, message) => {
        let web3 = this.props.state.web3
        let args = response.args

        let txDict = {
            ipfsHash: args.ipfsHash,
            txHash: response.transactionHash,
            reason: '',
            blockNumber: response.blockNumber,
            timeStamp: response.args.timeStamp,
            type: type
        }

        switch (type) {
            case LogTypes.award:
                txDict["adminAddress"] = args.minter
                txDict["awardedTo"] = args.awardedTo
                txDict["amount"] = (web3.fromWei(args.amount, 'ether')).toString(10)
                break
            case LogTypes.bulkAward:
                txDict["bulkCount"] = args.bulkCount.toString(10)
                txDict["adminAddress"] = args.minter

                // Force a reload in Grant History to show new bulk awards
                this.props.state.contract.reloadNeeded = true
                break
            case LogTypes.burn:
                txDict["burnFrom"] = args.burnFrom
                txDict["adminAddress"] = args.adminAddress
                txDict["amount"] = (web3.fromWei(args.amount, 'ether')).toString(10)
                break
            case LogTypes.adminAdded:
                txDict["account"] = args.account
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.adminRemoved:
                txDict["account"] = args.account
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.emergencyStop:
                txDict["activated"] = true
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.emergencyResume:
                txDict["activated"] = false
                txDict["adminAddress"] = args.adminAddress
                break
            default:
                break
        }

        // Update latest ipfsHash and combinedLogHistory
        let contractState = this.props.state.contract
        contractState.latestIpfsHash = ipfsHash

        contractState.combinedLogHistory.unshift(txDict)
        this.setState({ contract: contractState })
        this.props.updateState('Success!', message, 1);
    }

    awardTokens = async (event) => {
        event.preventDefault()
        document.getElementById("awardButton").disabled = true

        let web3 = this.props.state.web3

        // Set variables
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value

        if (address.length === 0 || amount.length === 0 || reason.length === 0) {
            this.props.updateState('All details must be filled in to award tokens', '', 2)
            return
        }

        // Record the award details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordAward(timeStamp, address, amount, reason)
        this.props.updateLoadingMessage('Entry added to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        // Make contract changes and attach the IPFS hash permanently to an admin tx record (and to the events log)
        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.award(address, amount, ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...', '', 0)

            let awardedEvent = khanaTokenInstance.LogAwarded({ fromBlock: 'latest' }, (err, response) => {

                // Ensure we're not detecting old events in previous (i.e. the current) block. 
                // This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    let message = "Transaction confirmed and tokens granted. See Grant History for more details."
                    this.finaliseTx(response, ipfsHash, LogTypes.award, message)
                    awardedEvent.stopWatching()
                    document.getElementById("awardButton").disabled = false
                }
            })
        }).catch((error) => {
            this.props.updateState('Awarding error', error.message, 3)
            document.getElementById("awardButton").disabled = false;
        })
    }

    bulkAwardTokens = async (event) => {
        event.preventDefault()
        document.getElementById("bulkAwardButton").disabled = true

        let web3 = this.props.state.web3

        let addresses = String(event.target.addresses.value).split(',').map(address => address.replace(/\s/g, ""))
        let amounts = String(event.target.amounts.value).split(',').map(amount => web3.toWei(amount, 'ether'))
        let reason = event.target.reason.value
        
        if (addresses.length === 0 || amounts.length === 0 || reason.length === 0) {
            this.props.updateState('All details must be filled in to award tokens', '', 2)
            return
        }

        // Record the award details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordBulkAward(timeStamp, addresses, amounts, reason)
        this.props.updateLoadingMessage('Entry added to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        // Make contract changes and attach the IPFS hash permanently to an admin tx record (and to the events log)
        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.awardBulk(addresses, amounts, ipfsHash, timeStamp, { from: accounts[0], gas: 300000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let bulkAwardEvent = khanaTokenInstance.LogBulkAwardedSummary({ fromBlock: 'latest' }, (err, response) => {

                // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    let message = "Transaction confirmed and tokens bulk awarded."
                    this.finaliseTx(response, ipfsHash, LogTypes.bulkAward, message)
                    bulkAwardEvent.stopWatching()
                    document.getElementById("bulkAwardButton").disabled = false
                }
            })
        }).catch((error) => {
            this.props.updateState('Bulk awarding error', error.message, 3)
            document.getElementById("bulkAwardButton").disabled = false;
        })
    }

    burnTokens = async(event) => {
        event.preventDefault();
        document.getElementById("burnTokens").disabled = true;

        let web3 = this.props.state.web3

        // Set variables
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value

        // Record the award details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordAward(timeStamp, address, amount, reason)
        this.props.updateLoadingMessage('Burn added to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.burn(address, amount, ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let burnEvent = khanaTokenInstance.LogBurned({ fromBlock: 'latest' }, (err, response) => {

                // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    let message = "Transaction confirmed and tokens burned."
                    this.finaliseTx(response, ipfsHash, LogTypes.burn, message)
                    burnEvent.stopWatching()
                    document.getElementById("burnTokens").disabled = false
                }
            })
        }).catch((error) => {
            this.props.updateState('Burning error', error.message, 3)
            document.getElementById("burnTokens").disabled = false;
        })
    }

    checkAdmin = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Checking if address is an admin...')

        let khanaTokenInstance = this.props.state.contract.instance
        khanaTokenInstance.checkIfAdmin(event.target.address.value).then((isAdmin) => {
            this.props.updateState('User ' + (isAdmin ? 'is ' : 'is not ') + 'an admin', '', (isAdmin ? 1 : 2))
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 2)
        })
    }

    addAdmin = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Adding user as an admin...')

        let address = event.target.address.value
        let reason = event.target.reason.value

        // Record the details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordAddAdmin(timeStamp, address, reason)
        this.props.updateLoadingMessage('New admin recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.addAdmin(address, ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then(() => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm')

            let addedEvent = khanaTokenInstance.LogAdminAdded({ fromBlock: 'latest' }, (err, response) => {
                let message = "User added as an admin"
                this.finaliseTx(response, ipfsHash, LogTypes.addAdmin, message)
                addedEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    removeAdmin = async (event) => {
        event.preventDefault()
        this.props.updateLoadingMessage('Removing user as an admin...')

        let address = event.target.address.value
        let reason = event.target.reason.value

        // Record the details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordRemoveAdmin(timeStamp, address, reason)
        this.props.updateLoadingMessage('Remove admin recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.removeAdmin(address, ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then(() => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm')

            let removedEvent = khanaTokenInstance.LogAdminRemoved({ fromBlock: 'latest' }, (err, response) => {
                let message = "User removed as an admin"
                this.finaliseTx(response, ipfsHash, LogTypes.removeAdmin, message)
                removedEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    tokenEmergencyStop = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Processing emergency stop...')

        let reason = event.target.reason.value

        // Record the details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordEmergencyStop(timeStamp, true, reason)
        this.props.updateLoadingMessage('Emergency stop recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.emergencyStop(ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((success) => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let disabledEvent = khanaTokenInstance.LogContractDisabled({ fromBlock: 'latest' }, (err, response) => {
                let message = "Emergency stop activated"
                this.finaliseTx(response, ipfsHash, LogTypes.emergencyStop, message)
                disabledEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    tokenResumeContract = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Re-enabling contracts...')

        let reason = event.target.reason.value

        // Record the details on IPFS audit log
        let auditInstance = new Audit(this.props)
        let timeStamp = Date.now()
        let ipfsHash = await auditInstance.recordEmergencyStop(timeStamp, false, reason)
        this.props.updateLoadingMessage('Re-enabling recorded to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.resumeContract(ipfsHash, timeStamp, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((success) => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let enabledEvent = khanaTokenInstance.LogContractEnabled({ fromBlock: 'latest' }, (err, response) => {
                let message = "Contract re-enabled"
                this.finaliseTx(response, ipfsHash, LogTypes.emergencyResume, message)
                enabledEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    render() {

        let contractEnabled = this.props.state.contract.contractEnabled
        let emergencyStopId = contractEnabled ? "tokenEmergencyStop" : "tokenResumeContract"

        return (

            <Pane padding={8} flex="1">

                {/* award individual tokens */}

                <Pane padding={14} marginBottom={16} background="greenTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Grant tokens to a community member</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.awardTokens} id="awardTokens">
                            <TextInputField
                                label="Member's address"
                                placeholder="0x...."
                                htmlFor="awardTokens"
                                type="text"
                                name="address"
                                required
                            />
                            <TextInputField
                                label={"Amount of " + this.props.state.contract.tokenSymbol}
                                placeholder="0.0"
                                htmlFor="awardTokens"
                                type="number"
                                name="amount"
                                required
                            />
                            <TextInputField
                                label="Reason for granting"
                                placeholder="..."
                                htmlFor="awardTokens"
                                type="text"
                                name="reason"
                                required
                            />
                            <Button type="submit" id="awardButton" marginLeft={8}>Grant</Button>
                        </form>
                    </Pane>
                </Pane>

                {/* bulk award tokens */}

                <Pane padding={14} marginBottom={16} background="greenTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Bulk grant tokens to community members</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.bulkAwardTokens} id="bulkAwardTokens">
                            <TextInputField
                                label="Member addresses"
                                description="Each address must be comma separated"
                                placeholder="0xAddress1, 0xAddress2, 0xAddress3..."
                                htmlFor="bulkAwardTokens"
                                type="text"
                                name="addresses"
                                required
                            />
                            <TextInputField
                                label={"Amount of " + this.props.state.contract.tokenSymbol}
                                placeholder="0.0"
                                htmlFor="bulkAwardTokens"
                                type="number"
                                name="amounts"
                                required
                            />
                            <TextInputField
                                label="Reason for bulk granting"
                                placeholder="..."
                                htmlFor="bulkAwardTokens"
                                type="text"
                                name="reason"
                                required
                            />
                            <Button type="submit" id="bulkAwardButton" marginLeft={8}>Bulk Grant</Button>
                        </form>
                    </Pane>
                </Pane>

                {/* Add new admin */}

                <Pane padding={14} marginBottom={16} background="tint1" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Add a new admin</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.addAdmin} id="addAdmin">
                            <TextInputField
                                label="Member's address"
                                placeholder="0x...."
                                htmlFor="addAdmin"
                                type="text"
                                name="address"
                                required
                            />
                            <TextInputField
                                label="Reason for adding (optional)"
                                placeholder="..."
                                htmlFor="addAdmin"
                                type="text"
                                name="reason"
                                required
                            />
                            <Button type="submit" id="addAdmin" marginLeft={8}>Add</Button>
                        </form>
                    </Pane>

                    {/* Remove admin */}

                    <Pane marginBottom={16} marginTop={32}>
                        <Heading size={400}>Remove an admin</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.removeAdmin} id="removeAdmin">
                            <TextInputField
                                label="Member's address"
                                placeholder="0x...."
                                htmlFor="removeAdmin"
                                type="text"
                                name="address"
                                required
                            />
                            <TextInputField
                                label="Reason for removing (optional)"
                                placeholder="..."
                                htmlFor="removeAdmin"
                                type="text"
                                name="reason"
                                required
                            />
                            <Button type="submit" id="removeAdmin" marginLeft={8}>Remove</Button>
                        </form>
                    </Pane>

                    {/* Check if admin */}

                    <Pane marginBottom={16} marginTop={32}>
                        <Heading size={400}>Check if admin</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.checkAdmin} id="checkAdmin">
                            <TextInputField
                                label="Member's address"
                                placeholder="0x...."
                                htmlFor="checkAdmin"
                                type="text"
                                name="address"
                                required
                            />
                            <Button type="submit" id="checkAdmin" marginLeft={8}>Check</Button>
                        </form>
                    </Pane>
                </Pane>

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

                {/* Emergency stop operations */}

                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Stop or Enable contract operations</Heading>
                    </Pane>
                    <form onSubmit={contractEnabled ? this.tokenEmergencyStop : this.tokenResumeContract} id={emergencyStopId}>
                        <TextInputField
                            label={contractEnabled ? "Reason for activation" : "Reason for re-enabling"}
                            placeholder="..."
                            htmlFor={emergencyStopId}
                            type="text"
                            name="reason"
                            required
                        />
                        <Button intent={contractEnabled ? "danger" : "warning"} iconBefore={contractEnabled ? "ban-circle" : "warning-sign"} type="submit" id={emergencyStopId} marginLeft={8}>
                            {contractEnabled ? "Activate Emergency Stop" : "Re-enable Contract"}
                        </Button>
                    </form>
                </Pane>
            </Pane>
        )
    }
}

export default Admin;



