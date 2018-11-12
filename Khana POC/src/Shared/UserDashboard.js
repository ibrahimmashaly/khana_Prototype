import React, { Component } from 'react'
import {shortenAddress} from '../utils/helpers';
import Audit from './Audit';

import { Pane, Heading, Text, TextInputField, Button, Alert } from 'evergreen-ui';


class UserDashboard extends Component {

    sellTokens = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Selling tokens...', '', 0)

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts
        let amount = this.props.state.web3.toWei(Number(event.target.amount.value), 'ether')
        let tokenBalance = this.props.state.web3.toWei(this.props.state.user.tokenBalance, 'ether')

        if (amount === 0) {
            this.props.updateState('Error', 'An amount must be entered', 2);
            return
        }

        khanaTokenInstance.calculateSellReturn.call(amount, tokenBalance).then((redeemableEth) => {
            let alert = confirm("You will receive " + this.props.state.web3.fromWei(redeemableEth, 'ether') + ' ETH in return for ' + this.props.state.web3.fromWei(amount, 'ether') + ' ' + this.props.state.contract.tokenSymbol + '. Are you sure?')

            if (alert === true) {
                khanaTokenInstance.sell(amount, { from: accounts[0], gas: 100000 }).then((success) => {
                    this.props.updateLoadingMessage('Waiting for transaction to confirm...', 'This may take a while depending on the network', 0)

                    let sellEvent = khanaTokenInstance.LogSell({ fromBlock: 'latest' }, (err, response) => {
                        let ethReceived = this.props.state.web3.fromWei(response.args.ethReceived.toString(), 'ether')

                        this.props.updateState('Success', 'Sell completed, received ' + ethReceived + ' ETH', 1);
                        sellEvent.stopWatching();
                    })
                }).catch((error) => {
                    this.props.updateState('Sell error occured!', error.message, 3)
                })
            } else {
                this.props.updateState()
            }
        }).catch((error) => {
            this.props.updateState('Sell calculation error', error.message, 3)
        })
    }

    getAuditFile = async (event) => {
        event.preventDefault();
        let audit = new Audit(this.props)
        let file = await audit.getAuditFile() // aray

        let newSingleAward = {
            "timeStamp": 1337,
            "toAddress": "0xFakeToAddress",
            "adminAddress": "0xFakeAdminAddress",
            "amount": "9999999999",
            "reason": "Testing insert to 0 for tokenActivity/awards/"
        }

        file.tokenActivity.awards.unshift(newSingleAward)

        let newBulkAward = {
            "timeStamp": 1540929958416,
            "toAddress": [
                "0xFakeToAddress1",
                "0xFakeToAddress2"
            ],
            "adminAddress": "0xFakeAdminAddress",
            "sameAmount": false,
            "amountEach": [
                "31000000000000000000",
                "62000000000000000000"
            ],
            "reason": "Attending meetup with different participations"
        }

        file.tokenActivity.awardsBulk.unshift(newBulkAward)

        let newBurns = {
            "timeStamp": 1540929958416,
            "toAddress": "0xFakeToAddress",
            "adminAddress": "0xFakeAdminAddress",
            "amount": "9000000000000000000",
            "reason": "Example burn"
        }

        file.tokenActivity.burns.unshift(newBurns)

        // tokenAdmin etc
        let auditChain = file.tokenAdmin.auditChain
        if (auditChain.length >= 5) {
            auditChain.pop()
        }
        auditChain.unshift("QmThisShouldBeFirstAuditChainHash")

        file.tokenAdmin.auditChain = auditChain

        // Change vault address
        file.tokenInfo.vaultAddress = "0xFakeVaultAddress"

        let ipfsHash = await audit.createNewAuditFile(file)
        console.log(ipfsHash)
    }

    render() {
        let portionOfSupply = ((this.props.state.user.tokenBalance / this.props.state.contract.totalSupply) * 100).toFixed(2)

        return (
            <Pane padding={8} flex="1">
                { !this.props.state.contract.contractEnabled && !this.props.state.app.isLoading &&
                <Pane marginBottom={16}>
                    <Alert
                        intent="danger"
                        title="Emergency stop activated"
                    >
                        The smart contract's emergency stop feature has been activated. Therefore most actions are currently disabled.
                        Contact your community leader(s) for more information.
                    </Alert>
                </Pane>
                }                
                
                <Pane padding={14} background="greenTint" borderRadius={5} border="default">
                    <Pane marginBottom={4}>
                        <Heading size={400}>My Information</Heading>
                    </Pane>
                    <Pane>
                        {this.props.state.app.isLoading ? (
                            <Text>Loading information...</Text>
                        ) : (
                            <Text>
                                My address : {shortenAddress(this.props.state.user.currentAddress)} <br />
                                My balance: {this.props.state.user.tokenBalance}  {this.props.state.contract.tokenSymbol} <br />
                                My portion of the supply: {portionOfSupply > 0 ? portionOfSupply : 0}%
                            </Text>
                        )}
                    </Pane>

                    <Pane marginBottom={4} marginTop={18}>
                        <Heading size={400}>Token Information</Heading>
                    </Pane>
                    <Pane>
                        {this.props.state.app.isLoading ? (
                            <Text>Loading information...</Text>
                        ) : (
                                <Text>
                                    {this.props.state.contract.tokenName} contract address: {shortenAddress(this.props.state.contract.address)}<br />
                                    Total supply: {this.props.state.contract.totalSupply} {this.props.state.contract.tokenSymbol}
                                </Text>
                            )}
                    </Pane>
                </Pane>

                <p></p>

                <Pane padding={14} background="tint1" borderRadius={5} border="default">
                    <Pane marginBottom={4}>
                        <Heading size={400}>Bonding Curve Information</Heading>
                    </Pane>
                    <Pane>
                        {this.props.state.app.isLoading ? (
                            <Text>Loading information...</Text>
                        ) : (
                            <Pane>
                                <Text>
                                    Bonding curve address: {shortenAddress(this.props.state.contract.fundsInstance.address)}<br />
                                    Amount in bonding curve: {((this.props.state.contract.ethAmount) * 1).toFixed(4)} ETH
                                </Text>
                                <p></p>
                                <Text>Sell your tokens to the bonding curve below</Text>
                                <Heading> WIP button function!</Heading>
                                
                                    <form onSubmit={this.getAuditFile} id="sell-tokens">
                                    <Pane flex={1} alignItems="baseline" display="flex">
                                        <TextInputField
                                            label=""
                                            placeholder="0.0"
                                            htmlFor="sell-tokens"
                                            type="text" 
                                            name="amount"
                                        />
                                        <Button type="submit" marginLeft={8}>Sell tokens</Button>
                                    </Pane>
                                </form>
                                
                            </Pane>
                        )}
                    </Pane>
                </Pane>

            </Pane>
        )
    }
}

export default UserDashboard;