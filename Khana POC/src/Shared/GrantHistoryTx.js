import React, { Component } from 'react'
import Audit from './Audit'

import {endPoints, copy, LogTypes} from '../utils/helpers'
import Linkify from 'react-linkify'
import {isMobileOnly} from 'react-device-detect'
import {shortenAddress} from '../utils/helpers'

import { Table, Pane, Button, Popover, Position, IconButton, Menu, Text, Heading, Paragraph} from 'evergreen-ui';

class GrantHistoryTx extends Component {    
    
    getIpfsReasons = async () => {
        this.props.updateLoadingMessage('Loading grant reasons', '', 0)

        let auditInstance = new Audit(this.props)
        let auditJson = await auditInstance.getAuditJson()
        
        let newCombinedList = []

        for (const tx of this.props.state.contract.combinedLogHistory) {
            let id = tx.timeStamp + "-" + tx.adminAddress
            switch (tx.type) {
                case LogTypes.award:
                    let path = auditJson.tokenActivity.awards[id] != null ? 
                        auditJson.tokenActivity.awards[id] :
                        auditJson.tokenActivity.awardsBulk[id]
                    tx.reason = path.reason
                    break
                case LogTypes.burn:
                    tx.reason = auditJson.tokenActivity.burns[id].reason
                    break
                case LogTypes.adminAdded:
                    tx.reason = auditJson.tokenAdmin.addAdmin[id].reason
                    break
                case LogTypes.adminRemoved:
                    tx.reason = auditJson.tokenAdmin.removeAdmin[id].reason
                    break
                case LogTypes.emergencyStop:
                    tx.reason = auditJson.tokenAdmin.emergencyStop[id].reason
                    break
                case LogTypes.emergencyResume:
                    tx.reason = auditJson.tokenAdmin.emergencyStop[id].reason
                    break
                default:
                    break
            }
            newCombinedList.push(tx)
        }
        
        let newState = this.props.state
        newState.contract.combinedLogHistory = newCombinedList
        this.props.updateStaticState(newState)
        this.props.updateState('Grant reasons loaded', '', 1)
    }

    createMenuItemToCopy = (text) => {
        return (
            <Menu.Item>
                {text}
            </Menu.Item>
        )
    }
    
    renderRowMenu = (tx) => {
        return (
            <Menu> 
                <Pane
                    width={200}
                    marginTop={16}
                    marginLeft={16}
                >
                    <Pane padding={4}>
                    {tx.reason !== '' ? (
                        <Text size={400}>
                            <Linkify properties={{target: '_blank'}}>
                                Grant Reason: {tx.reason}
                            </Linkify>
                        </Text>
                    ): (
                        <Text size={400}>
                            <Button 
                                marginRight={12} 
                                iconBefore="download"
                                onClick={this.getIpfsReasons}
                            >
                                Load granting reasons
                            </Button>
                        </Text>
                    )}
                    </Pane>

                </Pane>
                
                <Menu.Group>

                    <Menu.Divider />

                    <Menu.Item 
                        onSelect={() => { 
                            let url = endPoints.blockExplorer + "tx/" + tx.txHash
                            window.open(url, "_blank")
                        }}
                    >
                        See transaction details in block {tx.blockNumber}
                    </Menu.Item>

                    <Menu.Item
                        onSelect={() => {
                            let url = endPoints.ipfsEndpoint + tx.ipfsHash
                            window.open(url, "_blank")
                        }}
                    >
                        See audit log at time
                    </Menu.Item>

                    <Menu.Divider />

                    { copy(
                        this.createMenuItemToCopy('Copy admin address'), 
                        tx.adminAddress
                    )}

                    { copy(
                        this.createMenuItemToCopy('Copy receiver address'),
                        tx.awardedTo,
                    )}
                </Menu.Group>
            </Menu>
        )
    }

    renderReason = (tx) => {
        if (isMobileOnly) { return }
        return (
            <Table.Cell>
                <Paragraph width={300} marginY={8}>
                    <Linkify properties={{ target: '_blank' }}>
                        {tx.reason !== '' ? tx.reason : "Reason not yet loaded"}
                    </Linkify>
                </Paragraph>
            </Table.Cell>
        )
    }

    renderAward = (tx) => {
        return (
            <Table.Row
                key={tx.txHash + tx.awardedTo}
                onClick={() => {
                    // alert('selected')
                }}
                height='auto'>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>Award</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.adminAddress, false)}</Table.TextCell>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>{tx.amount} {this.props.state.contract.tokenSymbol}</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.awardedTo, false)}</Table.TextCell>
                {this.renderReason(tx)}
                <Table.Cell width={48} flex="none">
                    <Popover
                        content={this.renderRowMenu(tx)}
                        position={Position.BOTTOM_RIGHT}
                    >
                        <IconButton icon="more" height={24} appearance="minimal" />
                    </Popover>
                </Table.Cell>
            </Table.Row>
        )
    }

    renderBurn = (tx) => {
        return (
            <Table.Row
                key={tx.txHash}
                onClick={() => {
                    // alert('selected')
                }}
                height='auto'>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>Burn</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.adminAddress, false)}</Table.TextCell>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>-{tx.amount} {this.props.state.contract.tokenSymbol}</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.burnFrom, false)}</Table.TextCell>
                {this.renderReason(tx)}
                <Table.Cell width={48} flex="none">
                    <Popover
                        content={this.renderRowMenu(tx)}
                        position={Position.BOTTOM_RIGHT}
                    >
                        <IconButton icon="more" height={24} appearance="minimal" />
                    </Popover>
                </Table.Cell>
            </Table.Row>
        )
    }

    renderAdminAdded = (tx) => {
        return (
            <Table.Row
                key={tx.txHash}
                onClick={() => {
                    // alert('selected')
                }}
                height='auto'>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>Admin +</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.adminAddress, false)}</Table.TextCell>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>n/a</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.account, false)}</Table.TextCell>
                {this.renderReason(tx)}
                <Table.Cell width={48} flex="none">
                    <Popover
                        content={this.renderRowMenu(tx)}
                        position={Position.BOTTOM_RIGHT}
                    >
                        <IconButton icon="more" height={24} appearance="minimal" />
                    </Popover>
                </Table.Cell>
            </Table.Row>
        )
    }

    renderAdminRemoved = (tx) => {
        return (
            <Table.Row
                key={tx.txHash}
                onClick={() => {
                    // alert('selected')
                }}
                height='auto'>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>Admin -</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.adminAddress, false)}</Table.TextCell>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>n/a</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.account, false)}</Table.TextCell>
                {this.renderReason(tx)}
                <Table.Cell width={48} flex="none">
                    <Popover
                        content={this.renderRowMenu(tx)}
                        position={Position.BOTTOM_RIGHT}
                    >
                        <IconButton icon="more" height={24} appearance="minimal" />
                    </Popover>
                </Table.Cell>
            </Table.Row>
        )
    }

    renderEmergencyStop = (tx) => {
        return (
            <Table.Row
                key={tx.txHash}
                onClick={() => {
                    // alert('selected')
                }}
                height='auto'>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>{tx.activated ? "E.S" : "E.R"}</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.adminAddress, false)}</Table.TextCell>
                <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>n/a</Table.TextCell>
                <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>n/a</Table.TextCell>
                {this.renderReason(tx)}
                <Table.Cell width={48} flex="none">
                    <Popover
                        content={this.renderRowMenu(tx)}
                        position={Position.BOTTOM_RIGHT}
                    >
                        <IconButton icon="more" height={24} appearance="minimal" />
                    </Popover>
                </Table.Cell>
            </Table.Row>
        )
    }

    renderRows = () => {
        return this.props.state.contract.combinedLogHistory.map(tx => {
            switch (tx.type) {
                case LogTypes.award:
                    return this.renderAward(tx)
                case LogTypes.burn:
                    return this.renderBurn(tx)
                case LogTypes.adminAdded:
                    return this.renderAdminAdded(tx)
                case LogTypes.adminRemoved:
                    return this.renderAdminRemoved(tx)
                case LogTypes.emergencyStop:
                    return this.renderEmergencyStop(tx)
                case LogTypes.emergencyResume:
                    return this.renderEmergencyStop(tx)
                default:
                    return null
            }
        })
    }

    // TODO - set up for other Logged events such as burn etc

    render() {
        let zeroCombinedList = this.props.state.contract.combinedLogHistory == null ?
            true : this.props.state.contract.combinedLogHistory.length === 0
        return (
            <Pane alignItems="center" display="flex" justifyContent="center">
                {zeroCombinedList &&
                    <Pane margin={16}>
                        <Heading size={400}>No transaction history yet</Heading>
                    </Pane>
                }
                
                {this.props.state.contract.latestIpfsHash && !zeroCombinedList &&
                    <Pane width={isMobileOnly ? 344 : 800}>
                        <Table borderRadius={5} border="default" marginBottom={16}>
                            <Table.Head background="greenTint">
                                <Table.TextHeaderCell flexBasis={80} flexShrink={1} flexGrow={0}>Type</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={88} flexShrink={1} flexGrow={0}>Admin</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={80} flexShrink={1} flexGrow={0}>Amount</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={88} flexShrink={1} flexGrow={0}>Receiver</Table.TextHeaderCell>
                                {!isMobileOnly &&
                                    <Table.TextHeaderCell width={300}>Grant Reason</Table.TextHeaderCell>
                                }
                                <Table.TextHeaderCell width={48} flex="none"> </Table.TextHeaderCell>
                            </Table.Head>

                            <Table.Body>
                                {this.renderRows()}
                            </Table.Body>
                        </Table>

                        <Pane display="flex" padding={16} background="tint2" borderRadius={5}>
                            <Pane flex={1} alignItems="center" display="flex">
                                <Text size={300}>View the latest audit log of grants in JSON format (from IPFS)</Text>
                            </Pane>
                            <Button
                                marginLeft={8}
                                iconBefore="document-open"
                                onClick={() => {
                                    let url = endPoints.ipfsEndpoint + this.props.state.contract.latestIpfsHash
                                    window.open(url, "_blank")
                                }}
                            >
                                Open grant log
                            </Button>
                        </Pane>
                        <p></p>
                        <p></p>
                        <p></p>
                    </Pane>
                }
            </Pane>
        )
    }
}

export default GrantHistoryTx;