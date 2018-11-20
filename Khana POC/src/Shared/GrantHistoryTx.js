import React, { Component } from 'react'
import Audit from './Audit'

import {endPoints, copy} from '../utils/helpers'
import Linkify from 'react-linkify'
import {isMobileOnly} from 'react-device-detect'
import {shortenAddress} from '../utils/helpers'

import { Table, Pane, Button, Popover, Position, IconButton, Menu, Text, Heading, Paragraph} from 'evergreen-ui';

class GrantHistoryTx extends Component {
    
    getIpfsReasons = async (ipfsHash) => {
        this.props.updateLoadingMessage('Loading grant reasons...', '', 0)

        let auditInstance = new Audit(this.props)
        console.log(this.props)
        let auditJson = await auditInstance.getAuditJson()
        console.log(auditJson)


        // TODO: - get other events from other awards (e.g. burns etc)




        let contractState = this.props.state.contract
        contractState.ipfsLogHistory.tokenActivity.awards.forEach((value, index) => {
            value.reason = auditJson.tokenActivity.awards[index].reason
        })
        this.props.updateStaticState({ contract: contractState })
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
                {tx.reason != '' ? (
                    <Pane padding={4}>
                        <Text size={400}>
                            <Linkify properties={{target: '_blank'}}>
                                Grant Reason: {tx.reason}
                            </Linkify>
                        </Text>
                    </Pane>
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
                
                <Menu.Group>

                    <Menu.Divider />

                    <Menu.Item 
                        onSelect={() => { 
                            let url = endPoints.blockExplorer + "tx/" + tx.ethTxHash
                            window.open(url, "_blank")
                        }}
                    >
                        See transaction details
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
                        this.createMenuItemToCopy('Copy granter address'), 
                        tx.minter
                    )}

                    { copy(
                        this.createMenuItemToCopy('Copy receiver address'),
                        tx.awardedTo,
                    )}
                </Menu.Group>
            </Menu>
        )
    }

    // TODO - set up for other Logged events such as burn etc

    render() {
        let sortedTxList = this.props.state.contract.ipfsLogHistory.tokenActivity.awards.sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        })

        let transactionList = sortedTxList.map(tx => {
            if (tx.minter == null) { return null }
            return (
                <Table.Row 
                    key={tx.ethTxHash} 
                    onClick={() => {
                        // alert('selected')
                    }}
                    height='auto'>
                    <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.minter, false)}</Table.TextCell>
                    <Table.TextCell flexBasis={80} flexShrink={1} flexGrow={0}>{tx.amount} {this.props.state.contract.tokenSymbol}</Table.TextCell>
                    <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0}>{shortenAddress(tx.awardedTo, false)}</Table.TextCell>
                    <Table.TextCell flexBasis={88} flexShrink={1} flexGrow={0} isNumber={true}>{tx.blockNumber}</Table.TextCell>
                    {!isMobileOnly &&
                        <Table.Cell>
                            <Paragraph width={300} marginY={8}>
                                <Linkify properties={{ target: '_blank' }}>
                                    {tx.reason != '' ? tx.reason : "Reason not yet loaded"}
                                </Linkify>
                            </Paragraph>
                        </Table.Cell>
                    }
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
        })

        return (
            <Pane alignItems="center" display="flex" justifyContent="center">
                { sortedTxList.length === 0 &&
                    <Pane margin={16}>
                        <Heading size={400}>No transaction history</Heading>
                    </Pane>
                }
                
                {this.props.state.contract.latestIpfsHash && sortedTxList.length > 0 &&
                    <Pane width={isMobileOnly ? 344 : 800}>
                        <Table borderRadius={5} border="default" marginBottom={16}>
                            <Table.Head background="greenTint">
                                <Table.TextHeaderCell flexBasis={88} flexShrink={1} flexGrow={0}>Granter</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={80} flexShrink={1} flexGrow={0}>Amount</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={88} flexShrink={1} flexGrow={0}>Receiver</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={88} flexShrink={1} flexGrow={0}>Block#</Table.TextHeaderCell>
                                {!isMobileOnly &&
                                    <Table.TextHeaderCell width={300}>Grant Reason</Table.TextHeaderCell>
                                }
                                <Table.TextHeaderCell width={48} flex="none"> </Table.TextHeaderCell>
                            </Table.Head>

                            <Table.Body>
                                {transactionList}
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