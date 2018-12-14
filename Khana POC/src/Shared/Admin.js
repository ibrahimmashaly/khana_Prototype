import React, { Component } from 'react'
import Audit from './Audit'
import { LogTypes, checkForOldSession } from '../utils/helpers'

import { Pane, TextInputField, Heading, Button } from 'evergreen-ui'

class Admin extends Component {
    
    refreshIfNeeded = async () => {
        await checkForOldSession(this.props.state.app.lastLoadTimestamp, this.props.updateState)
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

        await this.refreshIfNeeded()

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
                    auditInstance.finaliseTx(response, ipfsHash, LogTypes.award, message)
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

        await this.refreshIfNeeded()

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
                    auditInstance.finaliseTx(response, ipfsHash, LogTypes.bulkAward, message)
                    bulkAwardEvent.stopWatching()
                    document.getElementById("bulkAwardButton").disabled = false
                }
            })
        }).catch((error) => {
            this.props.updateState('Bulk awarding error', error.message, 3)
            document.getElementById("bulkAwardButton").disabled = false;
        })
    }

    checkAdmin = async (event) => {
        event.preventDefault();
        let adminAddress = event.target.address.value

        await this.refreshIfNeeded()
        this.props.updateLoadingMessage('Checking if address is an admin...')

        let khanaTokenInstance = this.props.state.contract.instance
        khanaTokenInstance.checkIfAdmin(adminAddress).then((isAdmin) => {
            this.props.createNotification('User ' + (isAdmin ? 'is ' : 'is not ') + 'an admin', '', (isAdmin ? 1 : 2))

            let state = this.props.state
            state.app.isLoading = false
            this.props.updateStaticState(state)
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 2)
        })
    }

    addAdmin = async (event) => {
        event.preventDefault();

        let address = event.target.address.value
        let reason = event.target.reason.value

        await this.refreshIfNeeded()
        this.props.updateLoadingMessage('Adding user as an admin...')

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
                auditInstance.finaliseTx(response, ipfsHash, LogTypes.addAdmin, message)
                addedEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    removeAdmin = async (event) => {
        event.preventDefault()

        let address = event.target.address.value
        let reason = event.target.reason.value

        await this.refreshIfNeeded()
        this.props.updateLoadingMessage('Removing user as an admin...')

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
                auditInstance.finaliseTx(response, ipfsHash, LogTypes.removeAdmin, message)
                removedEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    tokenEmergencyStop = async (event) => {
        event.preventDefault();

        let reason = event.target.reason.value

        await this.refreshIfNeeded()
        this.props.updateLoadingMessage('Processing emergency stop...')

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
                auditInstance.finaliseTx(response, ipfsHash, LogTypes.emergencyStop, message)
                disabledEvent.stopWatching()
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    tokenResumeContract = async (event) => {
        event.preventDefault();

        let reason = event.target.reason.value

        await this.refreshIfNeeded()
        this.props.updateLoadingMessage('Re-enabling contracts...')

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
                auditInstance.finaliseTx(response, ipfsHash, LogTypes.emergencyResume, message)
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
                                label="Reason for adding"
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
                                label="Reason for removing"
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



