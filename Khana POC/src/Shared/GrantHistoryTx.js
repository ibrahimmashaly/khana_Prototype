import React, { Component } from 'react'
import ipfs from '../utils/ipfs'
import {endPoints, copy} from '../utils/helpers'
import Linkify from 'react-linkify'

import {Table, Pane, Button, Popover, Position, IconButton, Menu, Text} from 'evergreen-ui';

class GrantHistoryTx extends Component {
    
    getIpfsReasons = async (ipfsHash) => {
        this.props.updateLoadingMessage('Loading grant reasons...', '', 0)

        ipfs.files.cat('/ipfs/' + this.props.contract.latestIpfsHash, (err, file) => {
            if (err) {
                this.props.updateState("Grant file Error", err.message, 3)
            }

            // Parse JSON to object
            let auditLog = JSON.parse(file.toString('utf8'))

            let contractState = this.props.contract
            contractState.ipfsLogHistory.forEach((value, index) => {
                value.reason = auditLog[index].reason
            })
            this.props.updateStaticState({ contract: contractState })
            this.props.updateState('Grant reasons loaded', '', 1)
        })
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
                {tx.reason != null ? (
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

    render() {
        let sortedTxList = this.props.contract.ipfsLogHistory.sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        })

        let transactionList = sortedTxList.map(tx => {
            if (tx.minter == null) { return null }
            return (
                <Table.Row 
                    key={tx.ethTxHash} 
                    onClick={() => {
                        // alert('selected')
                    }
                    }>
                    <Table.TextCell flexBasis={64} flexShrink={1}>{tx.minter}</Table.TextCell>
                    <Table.TextCell flexBasis={72} flexShrink={1} flexGrow={1}>{tx.amount} {this.props.contract.tokenSymbol}</Table.TextCell>
                    <Table.TextCell flexBasis={64} flexShrink={1} flexGrow={1}>{tx.awardedTo}</Table.TextCell>
                    <Table.TextCell flexBasis={64} flexShrink={1} isNumber={true}>{tx.blockNumber}</Table.TextCell>
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
            <Pane>
                { sortedTxList.length === 0 &&
                    <Pane>No transaction history</Pane>
                }
                
                {this.props.contract.latestIpfsHash && sortedTxList.length > 0 &&
                    <Pane>
                        <Table borderRadius={5} border="default" marginBottom={16}>
                            <Table.Head background="greenTint">
                                <Table.TextHeaderCell flexBasis={64} flexShrink={1}>Granter</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={72} flexShrink={1} flexGrow={1}>Amount</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={64} flexShrink={1} flexGrow={1}>Receiver</Table.TextHeaderCell>
                                <Table.TextHeaderCell flexBasis={64} flexShrink={1}>Block#</Table.TextHeaderCell>
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
                                    let url = endPoints.ipfsEndpoint + sortedTxList[0].ipfsHash
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