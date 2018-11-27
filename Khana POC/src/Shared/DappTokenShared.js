import getWeb3 from '../utils/getWeb3'
import { Component } from 'react';
import { LogTypes } from '../utils/helpers';

class TokenShared extends Component {

    // Setup

    defaultState = {
        web3: null,
        contract: {
            instance: null,
            startingBlock: 0,
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
            combinedLogHistory: [],
            reloadNeeded: false,
            khanaInfo: { version: 0, lastUpgradeBlock: 0}
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
        navigation: 0, // Used for knowing where we are in the navigation 'tabs'
    }

    setupDefaultState = async () => {
        return this.defaultState
    }

    static setupWeb3 = async () => {
        // See utils/getWeb3 for more info.
        let web3 = await getWeb3
        return web3
    }

    // TODO: - Refactor into async/wait pattern when web3.js 1.0 is implemented

    static setupContracts = async (state, web3, tokenContract, bondingCurveContract, callback) => {
        tokenContract.setProvider(web3.currentProvider)
        bondingCurveContract.setProvider(web3.currentProvider)

        let eventParams = {
            fromBlock: state.contract.startingBlock,
            toBlock: 'latest'
        }

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

                let allAuditedEvents = contractInstance.LogAuditHash({}, eventParams)

                allAuditedEvents.get((err, result) => {
                    if (err) {
                        callback(null, "Error loading log events")
                    }

                    // get latest audit file via IPFS hash
                    let auditHistory = result.map((log) => {
                        return {
                            blockNumber: log.blockNumber,
                            txHash: log.transactionHash,
                            ipfsHash: log.args.ipfsHash
                        }
                    })

                    allAuditedEvents.stopWatching()

                    // Use the most recent IPFS hash
                    let ipfsEventLogged = auditHistory.length > 0 ? auditHistory[auditHistory.length - 1] : [{ ipfsHash: ""}]

                    let updatedState = state
                    updatedState.contract.latestIpfsHash = ipfsEventLogged.ipfsHash
                    
                    updatedState.contract.instance = contractInstance
                    updatedState.contract.fundsInstance = fundsInstance
                    updatedState.contract.tokenName = name
                    updatedState.contract.tokenSymbol = symbol
                    updatedState.contract.tokenAddress = contractInstance.address
                    updatedState.contract.vaultAddress = fundsInstance.address
                    updatedState.contract.logicAddress = contractInstance.address

                    updatedState.user.accounts = accounts
                    updatedState.user.isAdmin = isAdmin

                    callback(updatedState, null, true)
                })
            }).catch((error) => {
                callback(null, error)
            })
        })
    }

    // Updating

    // Get latest events from blockchain emitted events
    static updateAuditLogs = async (state, callback) => {
        let logicContractInstance = state.contract.instance
        
        let eventParams = {
            fromBlock: state.contract.startingBlock,
            toBlock: 'latest'
        }

        if (logicContractInstance == null) {
            // callback(null, "Contract instance not yet loaded")
            return
        }

        // get audit details from blockchain
        let logAwarded = []
        let logBulkAwardSummary = []
        let logBurned = []
        let logAdminAdded = []
        let logAdminRemoved = []
        let logEmergencyStop = []

        let allEvents = logicContractInstance.allEvents(eventParams)
        allEvents.get((err, results) => {
            if (err) {
                callback(null, "Error loading log events")
            }
            
            results.forEach((result) => {
                const args = result.args
                let auditTxHash = result.transactionHash
                let auditBlockNumber = result.blockNumber

                switch (result.event) {
                    case "LogAwarded":
                        logAwarded.unshift({
                            awardedTo: args.awardedTo,
                            adminAddress: args.minter,
                            amount: (state.web3.fromWei(args.amount, 'ether')).toString(10),
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.award
                        })
                        break
                    case "LogBulkAwardedSummary":
                        logBulkAwardSummary.unshift({
                            bulkCount: args.bulkCount.toString(10),
                            adminAddress: args.minter,
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.bulkAward
                        })
                        break
                    case "LogBurned":
                        logBurned.unshift({
                            burnFrom: args.burnFrom,
                            adminAddress: args.adminAddress,
                            amount: (state.web3.fromWei(args.amount, 'ether')).toString(10),
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.burn
                        })
                        break
                    case "LogAdminAdded":
                        logAdminAdded.unshift({
                            account: args.account,
                            adminAddress: args.adminAddress,
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.adminAdded
                        })
                        break
                    case "LogAdminRemoved":
                        logAdminRemoved.unshift({
                            account: args.account,
                            adminAddress: args.adminAddress,
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.adminRemoved
                        })
                        break
                    case "LogContractDisabled":
                        logEmergencyStop.unshift({
                            activated: true,
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            adminAddress: args.adminAddress,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.emergencyStop
                        })
                        break
                    case "LogContractEnabled":
                        logEmergencyStop.unshift({
                            activated: false,
                            ipfsHash: args.ipfsHash,
                            timeStamp: args.timeStamp,
                            adminAddress: args.adminAddress,
                            txHash: auditTxHash,
                            blockNumber: auditBlockNumber,
                            reason: '',
                            type: LogTypes.emergencyResume
                        })
                        break
                    default:
                        break
                }
            })

            // TODO: - 
            // LogFundsContractChanged
            // LogBulkAwardedFailure

            allEvents.stopWatching()

            let newCombined = logAwarded.concat(logBurned, logAdminAdded, logAdminRemoved, logEmergencyStop)
                .sort((a, b) => {
                return a.blockNumber < b.blockNumber ? 1 : -1
            })

            let updatedState = state
            updatedState.contract.reloadNeeded = false

            if (updatedState.contract.latestIpfsHash != null) {
                updatedState.contract.combinedLogHistory = newCombined
            }

            callback(updatedState)
        })
    }

    static updateLatestIpfsHash = (state) => {
        return new Promise((resolve, reject) => {
            let eventParams = {
                fromBlock: state.contract.startingBlock,
                toBlock: 'latest'
            }

            let allAuditedEvents = state.contract.instance.LogAuditHash({}, eventParams)

            allAuditedEvents.get((err, result) => {
                if (err) {
                    reject(err)
                }

                // get latest audit file via IPFS hash
                let auditHistory = result.map((log) => {
                    return {
                        blockNumber: log.blockNumber,
                        txHash: log.transactionHash,
                        ipfsHash: log.args.ipfsHash
                    }
                })

                allAuditedEvents.stopWatching()
                let ipfsEventLogged = auditHistory.length > 0 ? auditHistory[auditHistory.length - 1] : [{ ipfsHash: "" }]

                let updatedState = state
                updatedState.contract.latestIpfsHash = ipfsEventLogged.ipfsHash
                resolve(updatedState)
            })
        })
    }

    static getBalance = (state, address) => {
        return new Promise((resolve, reject) => {
            state.web3.eth.getBalance(address, (err, result) => {
                if (err) { reject(err); return }
                resolve(result)
            })
        })
    }

    // Updates state and gets live data from contracts
    static updateState = async (state, callback, message) => {
        let web3 = state.web3
        let khanaTokenInstance = state.contract.instance
        let accounts = state.user.accounts
        let fundsInstance = state.contract.fundsInstance
        var supply
        var tokenBalance
        var contractStatus

        khanaTokenInstance.getSupply.call().then((newSupply) => {
            supply = (web3.fromWei(newSupply, 'ether')).toString(10);
            return khanaTokenInstance.balanceOf(accounts[0])
        }).then((newBalance) => {
            tokenBalance = (web3.fromWei(newBalance, 'ether')).toString(10);
            return khanaTokenInstance.contractEnabled()
        }).then((status) => {
            contractStatus = status
            return TokenShared.getBalance(state, fundsInstance.address)
        }).then((balance) => {
            let newState = state
            newState.contract.totalSupply = supply
            newState.contract.address = khanaTokenInstance.address
            newState.contract.contractEnabled = contractStatus
            newState.contract.ethAmount = (web3.fromWei(balance, 'ether')).toString(10);
            newState.user.currentAddress = accounts[0]
            newState.user.tokenBalance = tokenBalance
            newState.app.status = message ? message : ''
            newState.app.isLoading = false

            return TokenShared.updateLatestIpfsHash(newState)
        }).then((updatedState) => {
            callback(updatedState)
        }).catch((error) => {
            callback(null, error)
        })

        if (message) {
            console.log(message);
        }
    }
}

export default TokenShared;