import React, { Component } from 'react'
import ipfs from '../utils/ipfs';

class Audit extends Component {

    createNewAuditFile = async () => {
        let ipfsContent = {
            path: '/' + this.props.state.contract.tokenName,
            content: Buffer.from('[ ' + JSON.stringify("test") + ' ]')
        }

        this.props.updateLoadingMessage('Creating inital IPFS file (may take a while)...')

        // Write description to IPFS, return hash
        const results = await ipfs.add(ipfsContent)
        return results[0].hash
    }

    getAuditFile = async (latestIpfsHash) => {
        // let latestIpfsHash = this.props.state.contract.latestIpfsHash
        // let latestIpfsHash = "QmaFqaPc3TGiNNguH4nangY3EGuofudNRJ8SqYjTMW7P48"
        
        // If there is no existing hash, then we are running for first time and need to create log file on IPFS
        if (!latestIpfsHash) {
            latestIpfsHash = await this.createNewAuditFile()
        } 

        const auditFile = await ipfs.files.cat('/ipfs/' + latestIpfsHash)

        // Parse the history as JSON, then add an entry to the start of array
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