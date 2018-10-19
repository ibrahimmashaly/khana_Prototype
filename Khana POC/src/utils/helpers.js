import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { FaCopy, FaCheck } from 'react-icons/fa';
import { IconContext } from "react-icons";

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
            <IconContext.Provider value={{ color: "gray", size: 14, className: "global-class-name" }}>
                <a href={endPoints.blockExplorer + "address/" + address} target="_blank">{shortAddress}</a>  <FaCopy />
            </IconContext.Provider>
        </span>
            
    </CopyToClipboard >
    )
}
