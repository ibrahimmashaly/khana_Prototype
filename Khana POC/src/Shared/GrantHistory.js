import React, { Component } from 'react'
import GrantHistoryTx from './GrantHistoryTx'
import TokenShared from './DappTokenShared'

import { Pane, Button } from 'evergreen-ui'

class GrantHistory extends Component {

    constructor(props) {
        super(props)
        this.state = { logsLoaded: false }
    }

    componentWillMount () {
        if (!this.state.logsLoaded) {
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
        this.setState({ logsLoaded: true })
    }

    render() {

        return(
            <Pane padding={8} flex="1">
                {this.state.contract !== null 
                || this.state.contract.ipfsLogHistory.tokenActivity.awards !== null 
                || this.state.contract.ipfsLogHistory.tokenActivity.awards.length > 0
                ? (
                    <GrantHistoryTx
                        state={this.props.state}
                        updateLoadingMessage={this.props.updateLoadingMessage}
                        updateState={this.props.updateState}
                        updateStaticState={this.props.updateStaticState}
                    />
                ) : (
                    <Button
                        iconBefore="load"
                        onClick={this.getAuditLogs}
                    >
                        Reload Grant History
                    </Button>
                )}
            </Pane>            
        )
    }
}

export default GrantHistory