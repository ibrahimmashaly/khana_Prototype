import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Icon, toaster } from 'evergreen-ui';

export let endPoints = {
    blockExplorer: "https://rinkeby.etherscan.io/",
    ipfsEndpoint: "https://gateway.ipfs.io/ipfs/"
}

// 
// Enums
//

export const LogTypes = {
    award: "award",
    bulkAward: "bulkAward",
    burn: "burn",
    adminAdded: "adminAdded",
    adminRemoved: "adminRemoved",
    emergencyStop: "emergencyStop",
    emergencyResume: "emergencyResume",
    tokenMigration: "tokenMigration"
}

//
// Clipboard operations
//

export function shortenAddress(address, showCopyToClipboard = true) {
    if (address == null) { return null }
    let shortAddress = address.substr(0, 6) + '...' + address.substr(address.length - 4)

    return (
        showCopyToClipboard ? (
            <span>
            <a href={endPoints.blockExplorer + "address/" + address} target="_blank">{shortAddress}</a>
            <CopyToClipboard 
                text={address}
                onCopy={() => {
                    notificationNotify('Copied to clipboard!')
                }}>
                <Icon icon="clipboard" appearance="minimal" height={24}/>
            </CopyToClipboard >
            </span>
        ) : (
            <a href={endPoints.blockExplorer + "address/" + address} target="_blank">{shortAddress}</a>
        )
    )
}

export function copy(object, textToCopy) {
    if (textToCopy == null || object == null) { return null }
    return (
        <CopyToClipboard
            text={textToCopy}
            onCopy={() => {
                notificationNotify('Copied to clipboard!')
            }}>
            {object}
        </CopyToClipboard >
    )
}

//
// Other operations
//

export async function checkForOldSession(lastLoadTimestamp, callback) {
    // Reload if > 10s
    if (Date.now() - lastLoadTimestamp > 10000) {
        await callback("Refreshing session", "One moment...")
    }
}

//
// Notifications
//

export function notificationNotify(message, description) {
    if (description != null) {
        toaster.notify(message, {description: description, duration: 5})
    } else {
        toaster.notify(message)
    }
}

export function notificationSuccess(message, description) {
    if (description != null) {
        toaster.success(message, { description: description, duration: 5 })
    } else {
        toaster.success(message)
    }
}

export function notificationWarning(message, description) {
    if (description != null) {
        toaster.warning(message, { description: description, duration: 10 })
    } else {
        toaster.warning(message)
    }
}

export function notificationDanger(message, description) {
    if (description != null) {
        toaster.danger(message, { description: description, duration: 10 })
    } else {
        toaster.danger(message)
    }
}