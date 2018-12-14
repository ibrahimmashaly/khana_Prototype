import React, { Component } from 'react'
import Audit from './Audit'
import { LogTypes, checkForOldSession } from '../utils/helpers'
import { Pane, TextInputField, Heading, Button } from 'evergreen-ui'

export default class Owner extends Component {

    // Any admin can still burng tokens based on smart contract. We just put the UX
    // here for now...
    burnTokens = async (event) => {
        event.preventDefault();
        document.getElementById("burnTokens").disabled = true;

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

    refreshIfNeeded = async () => {
        await checkForOldSession(this.props.state.app.lastLoadTimestamp, this.props.updateState)
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
            </Pane>
        )
    }
}