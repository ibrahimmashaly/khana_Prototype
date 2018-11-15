import React, { Component } from 'react'
import ipfs from '../utils/ipfs';

class Audit extends Component {

    createGenesisAuditJson = async () => {

        // @dev:            'createEmptyAuditJson' function is used to create the initial audit 
        //                  dictionary for a community. The dictionary should ultimately be converted
        //                  to a JSON file that is stored on IPFS.
        //                  This function also serves as a reference format for all audit files.
        //                  When the format is updated here, default values should also be set in
        //                  'DappTokenShared.js' -> defaultState and setupContracts()
        //
        // khanaInfo:       Information about the version of Khana they are using and 
        //                  when/if their contract was upgraded to a major framework change.
        //                  "version": a version number of the current Khana front end it is using.
        //                  "lastUpgradeBlock": the blockNumber of when this Khana implementation
        //                          was last upgraded.
        //
        // tokenInfo:       Information about the community's contracts at this point in time.
        //              
        // tokenAdmin:      Audit logs of the admin actions that have been taken.
        //                  "addAdmin": an array of the details of each time an admin was added.
        //                  "removeAdmin": an array of the details of each time an admin was removed.
        //                  "emergencyStop": an array of the details of each time the emergencyStop 
        //                          was activated or de-activated.
        //                  "moveFunds": an array of the details of each time vault funds were moved.
        //                  "auditChain": an array of the last 5 IPFS hashes of the audit logs that
        //                          have been confirmed on the blockchain.
        //                   "previousImportedAuditHashes": an array of the IPFS hashes of previous
        //                          audit files. These are recorded when the system is upgraded
        //                          and we need to import previous balances and records.
        // 
        // tokenActivity:   "burns": an array of the details of each admin initiated burn.
        //                          e.g. If for some reason an admin needs to penalise a member
        //                          and forceably burn a portion of their tokens.
        //                  "awardsBulk": an array of the details of each bulk award that is given.
        //                          e.g. Awarding 100 tokens to everyone who came to an event.
        //                  "awards": an array of the details of each award that is given.
        //                          e.g. Awarding 100 tokens to one person for completing a grant.
        //

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

    createAndUploadNewAuditFile = async (auditDict) => {

        let ipfsContent = {
            path: '/khana/' + this.props.state.contract.tokenName,
            content: Buffer.from(JSON.stringify(auditDict))
        }

        this.props.updateLoadingMessage('Creating IPFS file (may take a while)...')

        // Write description to IPFS, return hash
        const results = await ipfs.add(ipfsContent)

        return results[0].hash
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

    // @dev: returns IPFS hash of new audit file with record of award

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

    recordBulkAward = async () => {

    }

    // @dev: returns IPFS hash of new audit file with record of burn

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

    recordAddAdmin = async () => {

    }

    recordRemoveAdmin = async () => {

    }

    recordEmergencyStop = async (isActive) => {

    }

    recordImportAuditFile = async () => {
        // import entries from tokenAdmin (add to auditChain)
        // import entries from tokenActivity

        // update totalTokenSupply
    }


}

export default Audit;