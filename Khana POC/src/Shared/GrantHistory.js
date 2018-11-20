import React, { Component } from 'react'
import GrantHistoryTx from './GrantHistoryTx'
import TokenShared from './DappTokenShared'

import { Pane, Button } from 'evergreen-ui'

class GrantHistory extends Component {

    constructor(props) {
        super(props)

        this.state = { logsLoaded: false }
    }

    getAuditLogs = async () => {
        // set loading signal
        let startBlockNumber = this.props.startingBlock
        let state = this.props.state
        console.log(state)
        await TokenShared.updateAuditLogs(state, startBlockNumber, this.updateState)
    }

    updateState = async (newState) => {
        this.props.updateStaticState(newState)
        this.setState({ logsLoaded: true })
    }

    render() {
        const logsLoaded = this.state.logsLoaded
        return(
            <Pane padding={8} flex="1">

            {!logsLoaded ? (
                <Button
                    iconBefore="load"
                    onClick={this.getAuditLogs}
                >
                Load audit logs
                </Button>
            ) : (
                <GrantHistoryTx
                    state={this.props.state}
                    updateLoadingMessage={this.props.updateLoadingMessage}
                    updateState={this.props.updateState}
                    updateStaticState={this.props.updateStaticState}
                />
            )}
            </Pane>            
        )
    }
}

export default GrantHistory