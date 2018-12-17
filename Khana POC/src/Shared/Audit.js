import { Component } from 'react'
import ipfs from '../utils/ipfs'
import { LogTypes } from '../utils/helpers'

class Audit extends Component {

    /**
     * @dev 'createEmptyAuditJson' function is used to create the initial audit
     * dictionary for a community. The dictionary should ultimately be converted
     * to a JSON file that is stored on IPFS.
     * This function also serves as a reference format for all audit files.
     * When the format is updated here, default values should also be set in
     * 'DappTokenShared.js' -> defaultState and setupContracts().
     * 
     * Explanation of each JSON element:
     * 
     * "khanaInfo": Information about the version of Khana they are using and
     * when/if their contract was upgraded to a major framework change.
     * @param "version": a version number of the current Khana front end it is using.
     * @param "lastUpgradeBlock": the blockNumber of when this Khana implementation
     * was last upgraded.
     * 
     * "tokenInfo": Information about the community's contracts at this point in time.
     * 
     * "tokenAdmin": Audit logs of the admin actions that have been taken.
     * @param "addAdmin": an array of the details of each time an admin was added.
     * @param "removeAdmin": an array of the details of each time an admin was removed.
     * @param "emergencyStop": an array of the details of each time the emergencyStop
     * was activated or de-activated.
     * @param "moveFunds": an array of the details of each time vault funds were moved.
     * @param "auditChain": an array of the last 5 IPFS hashes of the audit logs that
     * have been confirmed on the blockchain.
     * @param "previousImportedAuditHashes": an array of the IPFS hashes of previous
     * audit files. These are recorded when the system is upgraded and we need to 
     * import previous balances and records.
     * @param "tokenMigrations": an array of the details of any previous token
     * migrations, e.g. when a new contract is deployed and old token balances need
     * to be migrated over.
     * 
     * "tokenActivity": All the transactional records of admins when creating and
     * destroying tokens.
     * @param "burns": an array of the details of each admin initiated burn.
     * e.g. If for some reason an admin needs to penalise a member
     * and forceably burn a portion of their tokens.
     * @param "awardsBulk": an array of the details of each bulk award that is given.
     * e.g. Awarding 100 tokens to everyone who came to an event.
     * @param "awards": an array of the details of each award that is given.
     * e.g. Awarding 100 tokens to one person for completing a grant.
     * 
     * @return The IPFS hash of the latest audit file.
    */
    createGenesisAuditJson = async () => {
        let defaultJson = {
            "khanaInfo": {
                "version": this.props.state.app.version,
                "lastUpgradeBlock": 0
            },
            "tokenInfo": {
                "tokenName": this.props.state.contract.tokenName,
                "tokenSymbol": this.props.state.contract.tokenSymbol,
                "tokenSupply": this.props.state.contract.tokenSupply,
                "tokenAddress": this.props.state.contract.tokenAddress,
                "vaultAddress": this.props.state.contract.vaultAddress,
                "logicAddress": this.props.state.contract.logicAddress
            },
            "tokenAdmin": {
                "addAdmin": {},
                "removeAdmin": {},
                "emergencyStop": {},
                "moveFunds": {},
                "auditChain": [],
                "previousImportedAuditHashes": [],
                "tokenMigrations": {},
                "adminMigrations": {}
            },
            "tokenActivity": {
                "burns": {},
                "awardsBulk": {},
                "awards": {}
            }
        }

        return defaultJson
    }

    /**
     * @dev Used for creating and uploading the latest audit file.
     * @param auditDict A JS dictionary of what should be included in the audit file.
     * @return The IPFS hash of the latest audit file.
    */
    createAndUploadNewAuditFile = async (auditDict) => {

        let currentIpfsHash = this.props.state.contract.latestIpfsHash

        if (currentIpfsHash != null) {
            auditDict.tokenAdmin.auditChain.unshift(currentIpfsHash)
            auditDict.khanaInfo.version = this.props.state.app.version
            auditDict.khanaInfo.tokenSupply = this.props.state.contract.tokenSupply
        }

        if (auditDict.tokenAdmin.auditChain.length > 5) {
            auditDict.tokenAdmin.auditChain.pop()
        }

        let ipfsContent = {
            path: '/khana/' + this.props.state.contract.tokenName,
            content: Buffer.from(JSON.stringify(auditDict))
        }

        this.props.updateLoadingMessage('Creating IPFS file', 'This may take a while...')

        // Write description to IPFS, return hash
        const results = await ipfs.add(ipfsContent)
        return results[0].hash
    }

    /**
     * @dev Used for fetching the latest audit file (or a new one if none exists).
     * @return A JS dictionary of the audit file.
    */
    getAuditJson = async () => {
        let latestIpfsHash = this.props.state.contract.latestIpfsHash
        let auditJson

        // If there is no existing hash, then we are running for first time and need to create genesis audit json
        if (!latestIpfsHash) {
            auditJson = await this.createGenesisAuditJson()
        } else {
            let auditFile = await ipfs.files.cat('/ipfs/' + latestIpfsHash)
            auditJson = JSON.parse(auditFile.toString('utf8'))
        }

        return auditJson
    }

    /**
     * @dev Used for awarding a single person.
     * @param toAddress Address of the person being awarded.
     * @param amount The amount to award them.
     * @param reasons The reason for the award.
     * @return IPFS hash of new audit file.
    */
    recordAward = async (timeStamp, toAddress, amount, reason) => {
        let auditHistory = await this.getAuditJson()

        let newSingleAward = {
            "toAddress": toAddress,
            "adminAddress": this.props.state.user.currentAddress,
            "amount": amount,
            "reason": reason
        }

        auditHistory.tokenActivity.awards[timeStamp + "-" + this.props.state.user.currentAddress] = newSingleAward
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for awarding a multiple people for multiple amounts.
     * @notice `amounts` must be an array of either a single amount or multiple amounts
     * with the same length as the accounts array.
     * @param accounts Array of the addresses of the people being awarded.
     * @param amounts Array of the amounts to award people. See @notice.
     * @param reasons The reason for the bulk award.
     * @return IPFS hash of new audit file.
    */
    recordBulkAward = async (timeStamp, accounts, amounts, reason) => {
        let auditHistory = await this.getAuditJson()

        let newBulkAward = {
            "toAddress": accounts,
            "adminAddress": this.props.state.user.currentAddress,
            "sameAmount": amounts.length === 1,
            "amountEach": amounts,
            "reason": reason
        }

        auditHistory.tokenActivity.awardsBulk[timeStamp + "-" + this.props.state.user.currentAddress] = newBulkAward
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for burning tokens from an address.
     * @notice We purposes do not have bulkBurns as this should not really
     * be used (we support full ownership of assets).
     * @param toAddress Address of the person being awarded.
     * @param amount The amount to award them.
     * @param reasons The reason for the award.
     * @return IPFS hash of new audit file.
    */
    recordBurn = async (timeStamp, toAddress, amount, reason) => {
        let auditHistory = await this.getAuditJson()

        let newBurn = {
            "toAddress": toAddress,
            "adminAddress": this.props.state.user.currentAddress,
            "amount": amount,
            "reason": reason
        }

        auditHistory.tokenActivity.burns[timeStamp + "-" + this.props.state.user.currentAddress] = newBurn
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for adding a new admin.
     * @param address Address of the new admin.
     * @param reasons The reason for the promotion.
     * @return IPFS hash of new audit file.
    */
    recordAddAdmin = async (timeStamp, address, reason) => {
        let auditHistory = await this.getAuditJson()

        let newAdmin = {
            "toAddress": address,
            "adminAddress": this.props.state.user.currentAddress,
            "reason": reason
        }

        auditHistory.tokenAdmin.addAdmin[timeStamp + "-" + this.props.state.user.currentAddress] = newAdmin
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for removing an admin.
     * @param address Address of the admin to be removed.
     * @param reasons The reason for the removal.
     * @return IPFS hash of new audit file.
    */
    recordRemoveAdmin = async (timeStamp, address, reason) => {
        let auditHistory = await this.getAuditJson()

        let removeAdmin = {
            "toAddress": address,
            "adminAddress": this.props.state.user.currentAddress,
            "reason": reason
        }

        auditHistory.tokenAdmin.removeAdmin[timeStamp + "-" + this.props.state.user.currentAddress] = removeAdmin
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for activating or de-activating the emergency stop
     * @param isActivating Bool of what action is being taken when calling.
     * @param reasons The reason for the removal.
     * @return IPFS hash of new audit file.
    */
    recordEmergencyStop = async (timeStamp, isActivating, reason) => {
        let auditHistory = await this.getAuditJson()

        let emergencyStop = {
            "adminAddress": this.props.state.user.currentAddress,
            "isActivated": isActivating,
            "reason": reason
        }

        auditHistory.tokenAdmin.emergencyStop[timeStamp + "-" + this.props.state.user.currentAddress] = emergencyStop
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for migrating previous admins to a new contract
     * @param timeStamp timeStamp of when this action was taken
     * @param oldContract The address of the old contract that is being migrated from
     * @param oldContractVersion The version of the old contract being migrated from
     * @param previousIpfsHash The previous IPFS hash that had audit records
     * @param reason The reasons for the migration
     * @param blockNumber The blockNumber when this action was taken
     * @return IPFS hash of new audit file.
    */
    migrateAdminAccounts = async (timeStamp, oldContract, oldContractVersion, previousIpfsHash, reason, blockNumber) => {
        let auditFile = await ipfs.files.cat('/ipfs/' + previousIpfsHash)
        let auditJson = JSON.parse(auditFile.toString('utf8'))

        let migration = {
            "oldContract": oldContract,
            "oldContractVersion": oldContractVersion,
            "previousIpfsHash": previousIpfsHash,
            "reason": reason
        }

        if (auditJson.tokenAdmin.adminMigrations == null) {
            auditJson.tokenAdmin["adminMigrations"] = {}
        }
        auditJson.tokenAdmin.adminMigrations[timeStamp + "-" + this.props.state.user.currentAddress] = migration
        auditJson.khanaInfo.lastUpgradeBlock = blockNumber
        auditJson.tokenInfo.tokenName = this.props.state.contract.tokenName
        auditJson.tokenInfo.tokenSymbol = this.props.state.contract.tokenSymbol
        auditJson.tokenInfo.tokenAddress = this.props.state.contract.tokenAddress
        auditJson.tokenInfo.vaultAddress = this.props.state.contract.vaultAddress
        auditJson.tokenInfo.logicAddress = this.props.state.contract.logicAddress

        return await this.createAndUploadNewAuditFile(auditJson)
    }

    /**
     * @dev Used for migrating old token balances to a new contract
     * @param timeStamp timeStamp of when this action was taken
     * @param oldContract The address of the old contract that is being migrated from
     * @param oldContractVersion The version of the old contract being migrated from
     * @param previousIpfsHash The previous IPFS hash that had audit records
     * @param reason The reasons for the migration
     * @param blockNumber The blockNumber when this action was taken
     * @return IPFS hash of new audit file.
    */
    migrateTokenBalances = async (timeStamp, oldContract, oldContractVersion, previousIpfsHash, reason, blockNumber) => {
        let auditFile = await ipfs.files.cat('/ipfs/' + previousIpfsHash)
        let auditJson = JSON.parse(auditFile.toString('utf8'))

        // parse if it is version 0.0, 0.1, 0.2 etc
        // TODO

        

        let migration = {
            "oldContract": oldContract,
            "oldContractVersion": oldContractVersion,
            "previousIpfsHash": previousIpfsHash,
            "reason": reason
        }

        if (auditJson.tokenAdmin.tokenMigrations == null) {
            auditJson.tokenAdmin["tokenMigrations"] = {}
        }
        auditJson.tokenAdmin.tokenMigrations[timeStamp + "-" + this.props.state.user.currentAddress] = migration
        auditJson.khanaInfo.lastUpgradeBlock = blockNumber
        auditJson.tokenInfo.tokenName = this.props.state.contract.tokenName
        auditJson.tokenInfo.tokenSymbol = this.props.state.contract.tokenSymbol
        auditJson.tokenInfo.tokenAddress = this.props.state.contract.tokenAddress
        auditJson.tokenInfo.vaultAddress = this.props.state.contract.vaultAddress
        auditJson.tokenInfo.logicAddress = this.props.state.contract.logicAddress

        return await this.createAndUploadNewAuditFile(auditJson)
    }





    /**
     * @dev Used to finalise each transaction that should be properly recorded on the audit logs
     * @param response The response from the node when the event was emitted
     * @param ipfsHash The IPFS hash which was used for this tx
     * @param type The LogTypes enum to determine what action this was
     * @param message The message to show to the end user when it is completed
     * @return IPFS hash of new audit file.
    */
    finaliseTx = async (response, ipfsHash, type, message) => {
        let web3 = this.props.state.web3
        let args = response.args

        let txDict = {
            ipfsHash: args.ipfsHash,
            txHash: response.transactionHash,
            reason: '',
            blockNumber: response.blockNumber,
            timeStamp: response.args.timeStamp,
            type: type
        }

        switch (type) {
            case LogTypes.award:
                txDict["adminAddress"] = args.minter
                txDict["awardedTo"] = args.awardedTo
                txDict["amount"] = (web3.fromWei(args.amount, 'ether')).toString(10)
                break
            case LogTypes.bulkAward:
                txDict["bulkCount"] = args.bulkCount.toString(10)
                txDict["adminAddress"] = args.minter
                this.props.state.contract.reloadNeeded = true
                break
            case LogTypes.burn:
                txDict["burnFrom"] = args.burnFrom
                txDict["adminAddress"] = args.adminAddress
                txDict["amount"] = (web3.fromWei(args.amount, 'ether')).toString(10)
                break
            case LogTypes.adminAdded:
                txDict["account"] = args.account
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.adminRemoved:
                txDict["account"] = args.account
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.emergencyStop:
                txDict["activated"] = true
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.emergencyResume:
                txDict["activated"] = false
                txDict["adminAddress"] = args.adminAddress
                break
            case LogTypes.tokenMigration:
                txDict["adminAddress"] = args.caller
                txDict["oldContract"] = args.oldContract
                txDict["oldContractVersion"] = (web3.fromWei(args.oldVersion, 'ether')).toString(10)
                this.props.state.contract.reloadNeeded = true
                break
            case LogTypes.adminMigration:
                txDict["adminAddress"] = args.caller
                txDict["oldContract"] = args.oldContract
                txDict["oldContractVersion"] = (web3.fromWei(args.oldVersion, 'ether')).toString(10)
                this.props.state.contract.reloadNeeded = true
                break
            default:
                break
        }

        this.props.state.contract.reloadNeeded = true

        // Update latest ipfsHash and combinedLogHistory
        let state = this.props.state
        state.contract.latestIpfsHash = ipfsHash
        state.contract.combinedLogHistory.unshift(txDict)
        state.contract.reloadNeeded = true
        state.app.isLoading = false

        await this.props.updateStaticState(state)
        this.props.createNotification('Success!', message, 1);
    }


    // loadJson = new Promise(function (resolve, reject) {
    //     var auditFile = '';
    //     var xmlhttp = new XMLHttpRequest();
    //     xmlhttp.onreadystatechange = function () {
    //         if (xmlhttp.status === 200 && xmlhttp.readyState === 4) {
    //             auditFile = xmlhttp.responseText;
    //             resolve(auditFile)
    //         }
    //     };
    //     // xmlhttp.open("GET", "https://gist.githubusercontent.com/mrdavey/993fc9e52c8a0f57b5e2b5dbaaf49c65/raw/e078ab9280ce487f72b5765230ce6e2689fcd999/audit_mock", true);
    //     xmlhttp.open("GET", "https://gateway.ipfs.io/ipfs/QmV7FFUNZBqbxV6ba47D3Fj9APKZH1RCJYeRA3mw6XsGVM", true);

    //     xmlhttp.send();
    // })

}

export default Audit;