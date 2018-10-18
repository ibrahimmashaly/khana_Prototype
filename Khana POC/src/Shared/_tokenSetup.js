import getWeb3 from '../utils/getWeb3'
import { Component } from 'react';

class TokenSetup extends Component {

    static setupDefaultState = async () => {
        let values = {
            web3: null,
            contract: {
                instance: null,
                fundsInstance: null,
                address: '',
                tokenName: '',
                tokenSymbol: '',
                totalSupply: 0,
                ethAmount: 0,
                contractEnabled: null,
                latestIpfsHash: null,
                ipfsLogHistory: [{
                    blockNumber: 0,
                    minter: null,
                    awardedTo: null,
                    amount: 0,
                    ipfsHash: '',
                    ethTxHash: '',
                    reason: ''
                }]
            },
            user: {
                accounts: null,
                currentAddress: null,
                tokenBalance: 0,
                isAdmin: false
            },
            app: {
                status: 'waiting...',
                isLoading: false,
            },
            navigation: 0, // Used for knowing where we are in the navigation 'tabs'
        }
        return values
    }

    static setupWeb3 = async () => {
        // See utils/getWeb3 for more info.
        let web3 = await getWeb3
        return web3
    }

    // TODO: - Refactor into async/wait pattern when web3.js 1.0 is implemented

    static setupContracts = async (web3, tokenContract, bondingCurveContract, contractDeployBlockNumber) => {
        tokenContract.setProvider(web3.currentProvider)
        bondingCurveContract.setProvider(web3.currentProvider)

        // this.updateStaticState({ app: { status: 'Loading from blockchain', isLoading: true } })

        var contractInstance;
        var name;
        var symbol;
        var fundsInstance;

        web3.eth.getAccounts((error, accounts) => {
            if (error) {
                // this.updateStaticState({ app: { status: 'Error occured: ' + error, isLoading: true } })
                return
            }

            if (accounts.length === 0) {
                // this.updateStaticState({ app: { status: 'No accounts detected! Have you unlocked your wallet?', isLoading: true } })
                return
            }

            tokenContract.deployed().then((tokenInstance) => {
                contractInstance = tokenInstance
            }).then(() => {
                return contractInstance.name()
            }).then((instanceName) => {
                name = instanceName
            }).then(() => {
                return contractInstance.symbol()
            }).then((instanceSymbol) => {
                symbol = instanceSymbol
            }).then(() => {
                return bondingCurveContract.deployed()
            }).then((bondingFundsInstance) => {
                fundsInstance = bondingFundsInstance
            }).then(() => {
                return contractInstance.checkIfAdmin.call(accounts[0])
            }).then((isAdmin) => {

                let awardEventsAll = contractInstance.LogAwarded({}, {
                    fromBlock: contractDeployBlockNumber,
                    toBlock: 'latest'
                })

                awardEventsAll.get((err, result) => {

                    if (error) {
                        // this.updateLoadingMessage(error)
                    }

                    let logHistory = result.map((log) => {
                        return {
                            blockNumber: log.blockNumber,
                            minter: log.args.minter,
                            awardedTo: log.args.awardedTo,
                            amount: (web3.fromWei(log.args.amount, 'ether')).toString(10),
                            ipfsHash: log.args.ipfsHash,
                            ethTxHash: log.transactionHash
                        }
                    })

                    awardEventsAll.stopWatching();

                    let ipfsEventLogged = result[result.length - 1]
                    
                    // Get latest IPFS hash if it exists

                    if (ipfsEventLogged != null) {
                        let updatedState = {
                            contract: {
                                instance: contractInstance,
                                fundsInstance: fundsInstance,
                                tokenName: name,
                                tokenSymbol: symbol,
                                latestIpfsHash: ipfsEventLogged.args.ipfsHash,
                                ipfsLogHistory: logHistory
                            },
                            user: {
                                accounts: accounts,
                                isAdmin: isAdmin
                            }
                        }
                        return updatedState
                    } else {

                        // No IPFS hash exists (i.e. we're just setting up the contract)
                        let updatedState = {
                            contract: {
                                instance: contractInstance,
                                fundsInstance: fundsInstance,
                                tokenName: name,
                                tokenSymbol: symbol,
                                ipfsLogHistory: []
                            },
                            user: {
                                accounts: accounts,
                                isAdmin: isAdmin
                            }
                        }
                        return updatedState
                    }
                })
            }).catch((error) => {
                console.log("Error: " + error)
                // this.updateLoadingMessage(error)
            })
        })
    }
}

export default TokenSetup;