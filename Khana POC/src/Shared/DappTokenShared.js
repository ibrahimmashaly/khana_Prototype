import getWeb3 from '../utils/getWeb3'
import { Component } from 'react';
import { LogTypes } from '../utils/helpers';

class TokenShared extends Component {

    static eventParams = {
        fromBlock: 0, //contractDeployBlockNumber,
        toBlock: 'latest'
    }

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
        navigation: 0, // Used for knowing where we are in the navigation 'tabs'
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

    static setupContracts = async (state, web3, tokenContract, bondingCurveContract, callback) => {
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

                let allAuditedEvents = contractInstance.LogAuditHash({}, TokenShared.eventParams)

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
    static updateAuditLogs = async (state, contractDeployBlockNumber, callback) => {
        let logicContractInstance = state.contract.instance
        
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

        let eventParams = {
            fromBlock: 0, //contractDeployBlockNumber,
            toBlock: 'latest'
        }

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
                            type: LogTypes.emergencyStop
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

            if (updatedState.contract.latestIpfsHash != null) {
                updatedState.contract.combinedList = newCombined
                updatedState.contract.ipfsLogHistory.tokenActivity.awards = logAwarded
                updatedState.contract.ipfsLogHistory.tokenActivity.awardsBulk = logBulkAwardSummary
                updatedState.contract.ipfsLogHistory.tokenActivity.burns = logBurned
                updatedState.contract.ipfsLogHistory.tokenAdmin.addAdmin = logAdminAdded
                updatedState.contract.ipfsLogHistory.tokenAdmin.removeAdmin = logAdminRemoved
                updatedState.contract.ipfsLogHistory.tokenAdmin.emergencyStop = logEmergencyStop
            }
            callback(updatedState)
        })
    }

    static updateLatestIpfsHash = async (state, callback) => {
        let allAuditedEvents = state.contract.instance.LogAuditHash({}, TokenShared.eventParams)

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
            let ipfsEventLogged = auditHistory.length > 0 ? auditHistory[auditHistory.length - 1] : [{ ipfsHash: "" }]

            let updatedState = state
            updatedState.contract.latestIpfsHash = ipfsEventLogged.ipfsHash
            callback(updatedState)
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

                TokenShared.updateLatestIpfsHash(newState, callback)
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