import { Component } from 'react'
import ipfs from '../utils/ipfs';

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
                "addAdmin": [],
                "removeAdmin": [],
                "emergencyStop": [],
                "moveFunds": [],
                "auditChain": [],
                "previousImportedAuditHashes": []
            },
            "tokenActivity": {
                "burns": [],
                "awardsBulk": [],
                "awards": []
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
        console.log(currentIpfsHash)
        if (currentIpfsHash != null) {
            auditDict.tokenAdmin.auditChain.unshift(currentIpfsHash)
        }

        if (auditDict.tokenAdmin.auditChain.length > 5) {
            auditDict.tokenAdmin.auditChain.pop()
        }

        let ipfsContent = {
            path: '/khana/' + this.props.state.contract.tokenName,
            content: Buffer.from(JSON.stringify(auditDict))
        }

        this.props.updateLoadingMessage('Creating IPFS file (may take a while)...')

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
    recordAward = async (toAddress, amount, reason) => {
        let auditHistory = await this.getAuditJson()

        let newSingleAward = {
            "timeStamp": Date.now(),
            "toAddress": toAddress,
            "adminAddress": this.props.state.user.currentAddress,
            "amount": amount,
            "reason": reason
        }

        auditHistory.tokenActivity.awards.unshift(newSingleAward)
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
    recordBulkAward = async (accounts, amounts, reason) => {
        let auditHistory = await this.getAuditJson()

        let newBulkAward = {
            "timeStamp": Date.now(),
            "toAddress": accounts,
            "adminAddress": this.props.state.user.currentAddress,
            "sameAmount": amounts.length === 1,
            "amountEach": amounts,
            "reason": reason
        }

        auditHistory.tokenActivity.awardsBulk.unshift(newBulkAward)
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
    recordBurn = async (toAddress, amount, reason) => {
        let auditHistory = await this.getAuditJson()

        let newBurn = {
            "timeStamp": Date.now(),
            "toAddress": toAddress,
            "adminAddress": this.props.state.user.currentAddress,
            "amount": amount,
            "reason": reason
        }

        auditHistory.tokenActivity.burns.unshift(newBurn)
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for adding a new admin.
     * @param address Address of the new admin.
     * @param reasons The reason for the promotion.
     * @return IPFS hash of new audit file.
    */
    recordAddAdmin = async (address, reason) => {
        let auditHistory = await this.getAuditJson()

        let newAdmin = {
            "timeStamp": Date.now(),
            "toAddress": address,
            "adminAddress": this.props.state.user.currentAddress,
            "reason": reason
        }

        auditHistory.tokenAdmin.addAdmin.unshift(newAdmin)
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for removing an admin.
     * @param address Address of the admin to be removed.
     * @param reasons The reason for the removal.
     * @return IPFS hash of new audit file.
    */
    recordRemoveAdmin = async (address, reason) => {
        let auditHistory = await this.getAuditJson()

        let removeAdmin = {
            "timeStamp": Date.now(),
            "toAddress": address,
            "adminAddress": this.props.state.user.currentAddress,
            "reason": reason
        }

        auditHistory.tokenAdmin.removeAdmin.unshift(removeAdmin)
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    /**
     * @dev Used for activating or de-activating the emergency stop
     * @param isActivating Bool of what action is being taken when calling.
     * @param reasons The reason for the removal.
     * @return IPFS hash of new audit file.
    */
    recordEmergencyStop = async (isActivating, reason) => {
        let auditHistory = await this.getAuditJson()

        let emergencyStop = {
            "timeStamp": Date.now(),
            "adminAddress": this.props.state.user.currentAddress,
            "isActivated": isActivating,
            "reason": reason
        }

        auditHistory.tokenAdmin.emergencyStop.unshift(emergencyStop)
        return await this.createAndUploadNewAuditFile(auditHistory)
    }

    recordImportAuditFile = async () => {
        // import entries from tokenAdmin (add to auditChain)
        // import entries from tokenActivity

        // update totalTokenSupply
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