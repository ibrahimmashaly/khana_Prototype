import getWeb3 from '../utils/getWeb3'
import { Component } from 'react'
import { LogTypes } from '../utils/helpers'

import v000 from '../DeployedAbis/v0.0.json'
import v001 from '../DeployedAbis/v0.1.json'
import v002 from '../DeployedAbis/v0.2.json'

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
            isAdmin: false,
            isOwner: false
        },
        app: {
            status: 'Loading...',
            detailedStatus: '',
            isLoading: true,
            version: 0.2,
            lastLoadTimestamp: Date.now()
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
        var isOwner;

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
                return contractInstance.owner.call()
            }).then((ownerAddress) => {
                isOwner = ownerAddress === accounts[0]
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
                    updatedState.user.isOwner = isOwner

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

        if (logicContractInstance == null) {
            // callback(null, "Contract instance not yet loaded")
            return
        }
        
        let [
            logAwarded, 
            logBulkAwardSummary, 
            logBurned, 
            logAdminAdded, 
            logAdminRemoved, 
            logEmergencyStop, 
            logTokenMigration,
            logAdminMigration
        ] = await TokenShared._processEventResults(state, logicContractInstance)

        if (logTokenMigration.length > 0) {
            let [
                _logAwarded,
                _logBulkAwardSummary,
                _logBurned,
                _logAdminAdded,
                _logAdminRemoved,
                _logEmergencyStop,
                _logTokenMigration,
                _logAdminMigration
            ] = await TokenShared._processMigrations(logTokenMigration, state)

            logAwarded = logAwarded.concat(_logAwarded)
            logBulkAwardSummary = logBulkAwardSummary.concat(_logBulkAwardSummary)
            logBurned = logBurned.concat(_logBurned)
            logAdminAdded = logAdminAdded.concat(_logAdminAdded)
            logAdminRemoved = logAdminRemoved.concat(_logAdminRemoved)
            logEmergencyStop = logEmergencyStop.concat(_logEmergencyStop)
            logTokenMigration = logTokenMigration.concat(_logTokenMigration)
            logAdminMigration = logAdminMigration.concat(_logAdminMigration)
        }

            // TODO: - 
            // LogFundsContractChanged
            // LogBulkAwardedFailure

        let newCombined = logAwarded.concat(logBurned, logAdminAdded, logAdminRemoved, logEmergencyStop, logTokenMigration, logAdminMigration)
            .sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        })

        let updatedState = state
        updatedState.contract.reloadNeeded = false

        if (updatedState.contract.latestIpfsHash != null) {
            updatedState.contract.combinedLogHistory = newCombined
        }

        callback(updatedState)
    }

    static _processEventResults = (state, contractInstance) => {
        let eventParams = {
            fromBlock: state.contract.startingBlock,
            toBlock: 'latest'
        }

        let logAwarded = []
        let logBulkAwardSummary = []
        let logBurned = []
        let logAdminAdded = []
        let logAdminRemoved = []
        let logEmergencyStop = []
        let logTokenMigration = []
        let logAdminMigration = []

        let allEvents = contractInstance.allEvents(eventParams)
        return new Promise((resolve, reject) => {
            allEvents.get((err, results) => {
                if (err) {
                    reject(null, "Error loading log events")
                }

                let iterations = results.map(result => {
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
                        case "LogTokenMigration":
                            logTokenMigration.unshift({
                                oldContract: args.oldContract,
                                oldContractVersion: args.oldVersion,
                                ipfsHash: args.ipfsHash,
                                timeStamp: args.timeStamp,
                                adminAddress: args.caller,
                                txHash: auditTxHash,
                                blockNumber: auditBlockNumber,
                                reason: '',
                                type: LogTypes.tokenMigration
                            })
                            break
                        case "LogBulkAdminAdded":
                            logAdminMigration.unshift({
                                adminAccounts: args.accounts,
                                oldContract: args.oldContract,
                                oldContractVersion: args.oldVersion,
                                ipfsHash: args.ipfsHash,
                                timeStamp: args.timeStamp,
                                adminAddress: args.caller,
                                txHash: auditTxHash,
                                blockNumber: auditBlockNumber,
                                reason: '',
                                type: LogTypes.adminMigration
                            })
                            break
                        case "LogBulkAwardedFailure":
                            // console.log(result)
                            break
                        default:
                            break
                    }

                    return null
                })

                Promise.all(iterations)
                .then(() => {
                    allEvents.stopWatching()
                    resolve([
                        logAwarded,
                        logBulkAwardSummary,
                        logBurned,
                        logAdminAdded,
                        logAdminRemoved,
                        logEmergencyStop,
                        logTokenMigration,
                        logAdminMigration
                    ])
                })
            })
        })
    }

    static _processMigrations = async (migrations, state) => {
        let logAwarded = []
        let logBulkAwardSummary = []
        let logBurned = []
        let logAdminAdded = []
        let logAdminRemoved = []
        let logEmergencyStop = []
        let logTokenMigration = []
        let logAdminMigration = []

        return new Promise(resolve => {
            let results = migrations.map(async migration => {

                let [
                    _logAwarded,
                    _logBulkAwardSummary,
                    _logBurned,
                    _logAdminAdded,
                    _logAdminRemoved,
                    _logEmergencyStop,
                    _logTokenMigration,
                    _logAdminMigration
                ] = await TokenShared._processSingleMigration(migration, state)

                logAwarded = logAwarded.concat(_logAwarded)
                logBulkAwardSummary = logBulkAwardSummary.concat(_logBulkAwardSummary)
                logBurned = logBurned.concat(_logBurned)
                logAdminAdded = logAdminAdded.concat(_logAdminAdded)
                logAdminRemoved = logAdminRemoved.concat(_logAdminRemoved)
                logEmergencyStop = logEmergencyStop.concat(_logEmergencyStop)
                logTokenMigration = logTokenMigration.concat(_logTokenMigration)
                logAdminMigration = logAdminMigration.concat(_logAdminMigration)

                // Perform this function recursively
                if (_logTokenMigration.length > 0) {
                    let [
                        __logAwarded,
                        __logBulkAwardSummary,
                        __logBurned,
                        __logAdminAdded,
                        __logAdminRemoved,
                        __logEmergencyStop,
                        __logTokenMigration,
                        _logAdminMigration
                    ] = await TokenShared._processMigrations(_logTokenMigration, state)

                    logAwarded = logAwarded.concat(__logAwarded)
                    logBulkAwardSummary = logBulkAwardSummary.concat(__logBulkAwardSummary)
                    logBurned = logBurned.concat(__logBurned)
                    logAdminAdded = logAdminAdded.concat(__logAdminAdded)
                    logAdminRemoved = logAdminRemoved.concat(__logAdminRemoved)
                    logEmergencyStop = logEmergencyStop.concat(__logEmergencyStop)
                    logTokenMigration = logTokenMigration.concat(__logTokenMigration)
                    logAdminMigration = logAdminMigration.concat(_logAdminMigration)
                }

                return null
            })

            Promise.all(results)
            .then(() => {
                resolve ([
                    logAwarded,
                    logBulkAwardSummary,
                    logBurned,
                    logAdminAdded,
                    logAdminRemoved,
                    logEmergencyStop,
                    logTokenMigration,
                    logAdminMigration
                ])
            })
        })
    }

    static _processSingleMigration = async (migration, state) => {
        let oldContractAddress = migration.oldContract
        let oldContractVersion = Number(state.web3.fromWei(migration.oldContractVersion, 'ether').toString())

        let contractAbi
        switch (oldContractVersion) {
            case 0:
                contractAbi = v000
                break;
            case 0.1:
                contractAbi = v001
                break;
            case 0.2:
                contractAbi = v002
                break;
            default:
                break;
        }

        let oldContract = state.web3.eth.contract(contractAbi)
        let oldContractInstance = oldContract.at(oldContractAddress)

        return await TokenShared._processEventResults(state, oldContractInstance)
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
    static updateState = (state, callback, message) => {
        return new Promise((resolve, reject) => {
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
                newState.app.lastLoadTimestamp = Date.now()

                return TokenShared.updateLatestIpfsHash(newState)
            }).then((updatedState) => {
                resolve(callback(updatedState))
            }).catch((error) => {
                reject(callback(null, error))
            })

            // if (message) {
            //     console.log(message);
            // }
        })
    }
}

export default TokenShared;