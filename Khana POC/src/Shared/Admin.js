import React, { Component } from 'react'
import ipfs from '../utils/ipfs';

import { Pane, TextInputField, Heading, Button } from 'evergreen-ui';

class Admin extends Component {

    awardTokens = (event) => {
        event.preventDefault();
        document.getElementById("awardButton").disabled = true;

        let web3 = this.props.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value

        if (address.length === 0 || amount.length === 0 || reason.length === 0) {
            this.props.updateState('All details must be filled in to award tokens', '', 2)
            return
        }

        let getIpfsFile = new Promise((ipfsResult) => {
            let latestIpfsHash = this.props.state.contract.latestIpfsHash
            let newContents = { "timeStamp": + Date.now(), "toAddress": address, "fromAddress": this.props.state.user.accounts[0], "amount": amount, "reason": reason }

            // If there is no existing hash, then we are running for first time and need to create log file on IPFS
            if (!latestIpfsHash) {
                let ipfsContent = {
                    path: '/' + this.props.state.contract.tokenName,
                    content: Buffer.from('[ ' + JSON.stringify(newContents) + ' ]')
                }

                this.props.updateLoadingMessage('Creating inital IPFS file (may take a while)...')

                // Write description to IPFS, return hash
                ipfsResult(ipfs.add(ipfsContent))
            } else {
                // Get most recent version of logs first
                ipfs.files.cat('/ipfs/' + this.props.state.contract.latestIpfsHash).then((file) => {

                    // Parse the history as JSON, then add an entry to the start of array
                    let auditHistory = JSON.parse(file.toString('utf8'))
                    auditHistory.unshift(newContents)

                    //Set up IPFS details
                    let ipfsContent = {
                        path: '/' + this.props.state.contract.tokenName,
                        content: Buffer.from(JSON.stringify(auditHistory))
                    }

                    this.props.updateLoadingMessage('Adding details to IPFS file (may take a while)...')

                    // Write description to IPFS, return hash
                    ipfsResult(ipfs.add(ipfsContent))
                })
            }
        })

        getIpfsFile.then((ipfsResult) => {

            // Then store the recent tx and record on blockchain (and events log)
            let ipfsHash = ipfsResult[0].hash
            this.props.updateLoadingMessage('Entry added to IPFS audit file successfully', 'Please confirm the ethereum transaction via your wallet and wait for it to confirm.', 0)

            // Make contract changes
            let khanaTokenInstance = this.props.state.contract.instance
            let accounts = this.props.state.user.accounts

            khanaTokenInstance.award(address, amount, ipfsHash, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

                this.props.updateLoadingMessage('Waiting for transaction to confirm...', '', 0)

                let awardedEvent = khanaTokenInstance.LogAwarded({ fromBlock: 'latest' }, (err, response) => {

                    // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                    if (response.blockNumber >= txResult.receipt.blockNumber) {

                        // Update latest ipfsHash and history
                        let contractState = this.props.state.contract
                        contractState.latestIpfsHash = ipfsHash
                        contractState.ipfsLogHistory.push({
                            blockNumber: response.blockNumber,
                            minter: response.args.minter,
                            awardedTo: response.args.awardedTo,
                            amount: (web3.fromWei(response.args.amount, 'ether')).toString(10),
                            ipfsHash: response.args.ipfsHash,
                            ethTxHash: response.transactionHash
                        })

                        this.setState({ contract: contractState })
                        this.props.updateState('Success!', 'Transaction confirmed and tokens granted. See Grant History for more details.', 1);

                        awardedEvent.stopWatching()
                        document.getElementById("awardButton").disabled = false;
                    }
                })
            }).catch((error) => {
                this.props.updateState('Awarding error', error.message, 3)
                document.getElementById("awardButton").disabled = false;
            })
        }).catch((error) => {
            this.props.updateState('IPFS file error', error.message, 3)
            document.getElementById("awardButton").disabled = false;
        })
    }

    burnTokens = async(event) => {
        event.preventDefault();
        document.getElementById("burnTokens").disabled = true;

        let web3 = this.props.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.burn(address, amount, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let burnEvent = khanaTokenInstance.LogBurned({ fromBlock: 'latest' }, (err, response) => {

                // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    this.props.updateState('Success!', 'Transaction confirmed and tokens burned.', 1);
                    burnEvent.stopWatching()
                    document.getElementById("burnTokens").disabled = false;
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

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts
        khanaTokenInstance.addAdmin(event.target.address.value, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then(() => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm')

            let addedEvent = khanaTokenInstance.LogAdminAdded({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('Success!', 'User added as an admin', 1);
                addedEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    removeAdmin = async (event) => {
        event.preventDefault()
        this.props.updateLoadingMessage('Removing user as an admin...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts
        khanaTokenInstance.removeAdmin(event.target.address.value, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then(() => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm')

            let removedEvent = khanaTokenInstance.LogAdminRemoved({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('Success', 'User removed as an admin', 1);
                removedEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    tokenEmergencyStop = async () => {
        event.preventDefault();
        this.props.updateLoadingMessage('Processing emergency stop...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.emergencyStop({ from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((success) => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let disabledEvent = khanaTokenInstance.LogContractDisabled({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('Success!', 'Emergency stop activated', 1);
                disabledEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    tokenResumeContract = async () => {
        event.preventDefault();
        this.props.updateLoadingMessage('Re-enabling token minting...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.resumeContract({ from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((success) => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let enabledEvent = khanaTokenInstance.LogContractEnabled({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('Success!', 'Contract re-enabled', 1);
                enabledEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState('Admin error', error.message, 3)
        })
    }

    render() {
        return (

            <Pane padding={8} flex="1">
                <Pane padding={14} marginBottom={16} background="greenTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Grant tokens to community members</Heading>
                    </Pane>
                    <Pane>
                        <form onSubmit={this.awardTokens} id="awardTokens">
                            <TextInputField
                                label="Member's address"
                                placeholder="0x...."
                                htmlFor="awardTokens"
                                type="text"
                                name="address"
                            />
                            <TextInputField
                                label={"Amount of " + this.props.state.contract.tokenSymbol}
                                placeholder="0.0"
                                htmlFor="awardTokens"
                                type="number"
                                name="amount"
                            />
                            <TextInputField
                                label="Reason for granting"
                                placeholder="..."
                                htmlFor="awardTokens"
                                type="text"
                                name="reason"
                            />
                            <Button type="submit" id="awardButton" marginLeft={8}>Grant</Button>
                        </form>
                    </Pane>
                </Pane>

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
                            />
                            <TextInputField
                                label="Reason for adding (optional)"
                                placeholder="..."
                                htmlFor="addAdmin"
                                type="text"
                                name="reason"
                            />
                            <Button type="submit" id="addAdmin" marginLeft={8}>Add</Button>
                        </form>
                    </Pane>

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
                            />
                            <TextInputField
                                label="Reason for removing (optional)"
                                placeholder="..."
                                htmlFor="removeAdmin"
                                type="text"
                                name="reason"
                            />
                            <Button type="submit" id="removeAdmin" marginLeft={8}>Remove</Button>
                        </form>
                    </Pane>

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
                            />
                            <Button type="submit" id="checkAdmin" marginLeft={8}>Check</Button>
                        </form>
                    </Pane>
                </Pane>

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
                            />
                            <TextInputField
                                label={"Amount of " + this.props.state.contract.tokenSymbol}
                                placeholder="0.0"
                                htmlFor="burnTokens"
                                type="number"
                                name="amount"
                            />
                            <TextInputField
                                label="Reason for burning"
                                placeholder="..."
                                htmlFor="burnTokens"
                                type="text"
                                name="reason"
                            />
                            <Button type="submit" id="burnTokens" marginLeft={8}>Burn</Button>
                        </form>
                    </Pane>
                </Pane>

                <Pane padding={14} marginBottom={16} background="redTint" borderRadius={5} border="default">
                    <Pane marginBottom={16}>
                        <Heading size={400}>Stop or Enable contract operations</Heading>
                    </Pane>
                    {this.props.state.contract.contractEnabled ? (
                        <Button intent="danger" iconBefore="ban-circle" onClick={this.tokenEmergencyStop}> Activate Emergency Stop </Button>
                    ) : (
                        <Button intent="warning" iconBefore="warning-sign" onClick={this.tokenResumeContract}> Re-enable Contract </Button>
                        )}
                </Pane>
            </Pane>
        )
    }
}

export default Admin;



