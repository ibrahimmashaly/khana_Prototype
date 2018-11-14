import getWeb3 from '../utils/getWeb3'
import { Component } from 'react';

class TokenShared extends Component {

    // Setup

    static defaultState = {
        web3: null,
        contract: {
            instance: null,
            fundsInstance: null,
            address: '',
            tokenName: '',
            tokenSymbol: '',
            totalSupply: 0,
            tokenAddress: '',
            vaultAddress: '',
            logicAddress: '',
            ethAmount: 0,
            contractEnabled: null,
            latestIpfsHash: null,
            ipfsLogHistory: {
                khanaInfo: { version: 0, lastUpgradeBlock: 0},
                tokenInfo: {},
                tokenAdmin: {
                    addAdmin: [],
                    removeAdmin: [],
                    emergencyStop: [],
                    moveFunds: [],
                    auditChain: [],
                    previousImportedAuditHashes: []
                },
                tokenActivity: {
                    awards: [],
                    awardsBulk: [],
                    burns: []
                }
            }
        },
        user: {
            accounts: null,
            currentAddress: null,
            tokenBalance: 0,
            isAdmin: false
        },
        app: {
            status: 'Loading...',
            isLoading: true,
            version: 0.1
        },
        navigation: 2, // Used for knowing where we are in the navigation 'tabs'
    }

    static setupDefaultState = async () => {
        return TokenShared.defaultState
    }

    static setupWeb3 = async () => {
        // See utils/getWeb3 for more info.
        let web3 = await getWeb3
        return web3
    }

    // TODO: - Refactor into async/wait pattern when web3.js 1.0 is implemented

    static setupContracts = async (state, web3, tokenContract, bondingCurveContract, contractDeployBlockNumber, callback) => {
        tokenContract.setProvider(web3.currentProvider)
        bondingCurveContract.setProvider(web3.currentProvider)


        var contractInstance;
        var name;
        var symbol;
        var fundsInstance;

        // getAccounts is a callback :(
        web3.eth.getAccounts((error, accounts) => {
            if (error) {
                callback(null, error)
                return
            }

            if (accounts.length === 0) {
                callback(null, Error("No accounts detected! Have you unlocked your wallet?"))
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
                    fromBlock: 0, //contractDeployBlockNumber,
                    toBlock: 'latest'
                })

                awardEventsAll.get((err, result) => {
                    if (err) {
                        callback(null,"Error loading log events")
                    }

                    let logAwardHistory = result.map((log) => {
                        return {
                            blockNumber: log.blockNumber,
                            minter: log.args.minter,
                            awardedTo: log.args.awardedTo,
                            amount: (web3.fromWei(log.args.amount, 'ether')).toString(10),
                            ipfsHash: log.args.ipfsHash,
                            ethTxHash: log.transactionHash,
                            reason: ''
                        }
                    })

                    awardEventsAll.stopWatching();

                    let ipfsEventLogged = result[result.length - 1]

                    // Get latest IPFS hash if it exists
                    let updatedState = state

                    updatedState.contract.instance = contractInstance
                    updatedState.contract.fundsInstance = fundsInstance
                    updatedState.contract.tokenName = name
                    updatedState.contract.tokenSymbol = symbol
                    updatedState.contract.tokenAddress = contractInstance.address
                    updatedState.contract.vaultAddress = fundsInstance.address
                    updatedState.contract.logicAddress = contractInstance.address

                    updatedState.user.accounts = accounts
                    updatedState.user.isAdmin = isAdmin

                    if (ipfsEventLogged != null) {
                        updatedState.contract.latestIpfsHash = ipfsEventLogged.args.ipfsHash
                        updatedState.contract.ipfsLogHistory.tokenActivity.awards = logAwardHistory
                    }
                    callback(updatedState, null, true)
                })
            }).catch((error) => {
                callback(null, error)
            })
        })
    }

    // Updating

    // Updates state and gets live data from contracts
    static updateState = async (state, callback, message) => {
        let web3 = state.web3
        let khanaTokenInstance = state.contract.instance
        let accounts = state.user.accounts
        let fundsInstance = state.contract.fundsInstance
        var supply
        var tokenBalance

        khanaTokenInstance.getSupply.call().then((newSupply) => {
            supply = (web3.fromWei(newSupply, 'ether')).toString(10);
            return khanaTokenInstance.balanceOf(accounts[0])
        }).then((newBalance) => {
            tokenBalance = (web3.fromWei(newBalance, 'ether')).toString(10);
            return khanaTokenInstance.contractEnabled()
        }).then((contractStatus) => {

            web3.eth.getBalance(fundsInstance.address, (err, result) => {
                let newState = state
                newState.contract.totalSupply = supply
                newState.contract.address = khanaTokenInstance.address
                newState.contract.contractEnabled = contractStatus
                newState.contract.ethAmount = (web3.fromWei(result, 'ether')).toString(10);
                newState.user.currentAddress = accounts[0]
                newState.user.tokenBalance = tokenBalance
                newState.app.status = message ? message : ''
                newState.app.isLoading = false

                callback(newState)
            })

        }).catch((error) => {
            callback(null, error)
        })

        if (message) {
            console.log(message);
        }
    }
}

export default TokenShared;