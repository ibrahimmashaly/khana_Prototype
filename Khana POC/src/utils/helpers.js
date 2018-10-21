import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Icon } from 'evergreen-ui';

export let endPoints = {
    blockExplorer: "https://rinkeby.etherscan.io/",
    ipfsEndpoint: "https://gateway.ipfs.io/ipfs/"
}

export function shortenAddress(address, callback) {
    if (address == null) { return null }
    let shortAddress = address.substr(0, 6) + '...' + address.substr(address.length - 4)

    return (
    <CopyToClipboard 
        text={address}
        onCopy={() => {
            callback('Copied to clipboard!')
        }}>

        <span>
            <a href={endPoints.blockExplorer + "address/" + address} target="_blank">{shortAddress}</a>  <Icon icon="clipboard" />
        </span>
            
    </CopyToClipboard >
    )
}

export function copy(object, textToCopy, callback) {
    if (textToCopy == null || object == null) { return null }
    return (
        <CopyToClipboard
            text={textToCopy}
            onCopy={() => {
                callback('Copied to clipboard!')
            }}>
            {object}
        </CopyToClipboard >
    )
}
