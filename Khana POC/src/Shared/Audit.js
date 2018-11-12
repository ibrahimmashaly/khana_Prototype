import React, { Component } from 'react'
import ipfs from '../utils/ipfs';

class Audit extends Component {

    createNewAuditFile = async (auditDict) => {
        // let ipfsContent = {
        //     path: '/' + this.props.state.contract.tokenName,
        //     content: Buffer.from('[ ' + JSON.stringify("test") + ' ]')
        // }

        let ipfsContent = {
            path: '/' + this.props.state.contract.tokenName,
            content: Buffer.from(JSON.stringify(auditDict))
        }

        this.props.updateLoadingMessage('Creating inital IPFS file (may take a while)...')

        // Write description to IPFS, return hash
        const results = await ipfs.add(ipfsContent)
        return results[0].hash
    }

    loadJson = new Promise(function (resolve, reject) {
        var auditFile = '';
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.status === 200 && xmlhttp.readyState === 4) {
                auditFile = xmlhttp.responseText;
                resolve(auditFile)
            }
        };
        // xmlhttp.open("GET", "https://gist.githubusercontent.com/mrdavey/993fc9e52c8a0f57b5e2b5dbaaf49c65/raw/4784a8454f63629fdda38594f3215332a49c0623/audit_mock", true);
        xmlhttp.open("GET", "https://gateway.ipfs.io/ipfs/QmV7FFUNZBqbxV6ba47D3Fj9APKZH1RCJYeRA3mw6XsGVM", true);

        xmlhttp.send();
    })

    getAuditFile = async () => {
        // let latestIpfsHash = this.props.state.contract.latestIpfsHash
        
        // // If there is no existing hash, then we are running for first time and need to create log file on IPFS
        // if (!latestIpfsHash) {
        //     latestIpfsHash = await this.createNewAuditFile()
        // } 

        // const auditFile = await ipfs.files.cat('/ipfs/' + latestIpfsHash)


        let auditFile = await this.loadJson
        // Parse the JSON history into a JS object (dict)
        let auditHistory = JSON.parse(auditFile.toString('utf8'))

        return auditHistory
    }

    recordAward = async () => {
        // let newContents = { "timeStamp": + Date.now(), "toAddress": address, "fromAddress": this.props.state.user.accounts[0], "amount": amount, "reason": reason }

        // // Parse the history as JSON, then add an entry to the start of array
        // let auditHistory = JSON.parse(file.toString('utf8'))
        // auditHistory.unshift(newContents)

        // //Set up IPFS details
        // let ipfsContent = {
        //     path: '/' + this.props.state.contract.tokenName,
        //     content: Buffer.from(JSON.stringify(auditHistory))
        // }

        // this.props.updateLoadingMessage('Adding details to IPFS file (may take a while)...')

        // // Write description to IPFS, return hash
        // ipfsResult(ipfs.add(ipfsContent))
    }

    recordBulkAward = async () => {

    }

    recordBurn = async () => {

    }

    recordAddAdmin = async () => {

    }

    recordRemoveAdmin = async () => {

    }

    recordEmergencyStop = async () => {

    }

    recordEmergencyRecovery = async () => {

    }

    recordImportAuditFile = async () => {

    }



}

export default Audit;