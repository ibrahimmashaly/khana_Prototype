import React, { Component } from 'react'
import {shortenAddress} from '../utils/helpers';

import { Pane, Heading, Text, TextInputField, Button, Alert } from 'evergreen-ui';


class UserDashboard extends Component {

    sellTokens = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Selling tokens...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts
        let amount = this.props.state.web3.toWei(Number(event.target.amount.value), 'ether')
        let tokenBalance = this.props.state.web3.toWei(this.props.state.user.tokenBalance, 'ether')

        if (amount === 0) {
            this.props.updateState('An amount must be entered');
            return
        }

        khanaTokenInstance.calculateSellReturn.call(amount, tokenBalance).then((redeemableEth) => {
            let alert = confirm("You will receive " + this.props.state.web3.fromWei(redeemableEth, 'ether') + ' ETH in return for ' + this.props.state.web3.fromWei(amount, 'ether') + ' ' + this.props.state.contract.tokenSymbol + '. Are you sure?')

            if (alert === true) {
                khanaTokenInstance.sell(amount, { from: accounts[0], gas: 100000 }).then((success) => {
                    this.props.updateLoadingMessage('Waiting for transaction to confirm...')

                    let sellEvent = khanaTokenInstance.LogSell({ fromBlock: 'latest' }, (err, response) => {
                        let ethReceived = this.props.state.web3.fromWei(response.args.ethReceived.toString(), 'ether')

                        this.props.updateState('Sell completed, received ' + ethReceived + ' ETH');
                        sellEvent.stopWatching();
                    })
                }).catch((error) => {
                    this.props.updateState(error.message)
                })
            } else {
                this.props.updateState()
            }
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    render() {
        
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
                                My address : {shortenAddress(this.props.state.user.currentAddress, this.props.updateState)} <br />
                                My balance: {this.props.state.user.tokenBalance}  {this.props.state.contract.tokenSymbol} <br />
                                My portion of the supply: {((this.props.state.user.tokenBalance / this.props.state.contract.totalSupply) * 100).toFixed(2)}%
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
                                    {this.props.state.contract.tokenName} contract address: {shortenAddress(this.props.state.contract.address, this.props.updateState)}<br />
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
                                    Bonding curve address: {shortenAddress(this.props.state.contract.fundsInstance.address, this.props.updateState)}<br />
                                    Amount in bonding curve: {((this.props.state.contract.ethAmount) * 1).toFixed(4)} ETH
                                </Text>
                                <p></p>
                                <Text>Sell your tokens to the bonding curve below</Text>
                                
                                <form onSubmit={this.sellTokens} id="sell-tokens">
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