import React, { Component } from 'react'
import GrantHistoryTx from './GrantHistoryTx'
import TokenShared from './DappTokenShared'

import { Pane, Button } from 'evergreen-ui'

class GrantHistory extends Component {

    componentDidMount () {
        if (this.props.state.contract.combinedLogHistory.length === 0 ||
            this.props.state.contract.reloadNeeded === true
        ) {
            this.getAuditLogs()
        }
    }

    getAuditLogs = async () => {
        // set loading signal
        let startBlockNumber = this.props.startingBlock
        let state = this.props.state
        await TokenShared.updateAuditLogs(state, startBlockNumber, this.updateState)
    }

    updateState = async (newState) => {
        this.props.updateStaticState(newState)
    }

    render() {

        return(
            <Pane padding={8} flex="1">
                <GrantHistoryTx
                    state={this.props.state}
                    updateLoadingMessage={this.props.updateLoadingMessage}
                    updateState={this.props.updateState}
                    updateStaticState={this.props.updateStaticState}
                />
            </Pane>            
        )
    }
}

export default GrantHistory