import React, { Component } from 'react';

import { Pane, Heading, Tablist, Tab } from 'evergreen-ui'

class Navigation extends Component {

    handleNavigation = (value) => {
        let state = this.props.state
        state.navigation = value
        this.props.updateStaticState(state)
    }

    createTab = (name, index) => {
        return (
            <Tab
                key={name}
                id={name}
                onSelect={() => {
                    this.handleNavigation(index)
                }}
                isSelected={index === this.props.state.navigation}
            >
                {name}
            </Tab>
        )
    }

    render() {
        return (
            <Pane>
                <Heading size={100} marginTop="default">Khana Framework: 📈 {this.props.state.contract.tokenName} ({this.props.state.contract.tokenSymbol})</Heading>
                {/* <Heading size={100} marginTop="default">{this.props.state.contract.contractEnabled && this.props.state.contract.length !== 0 ? "" : " - ❌ Current disabled ❌"}</Heading> */}
                <Tablist marginTop={16} marginBottom={16} flexBasis={240} marginRight={24}>
                    {this.createTab('Dashboard', 0)}
                    {this.createTab('Tx History', 1)}
                    {this.props.state.user.isAdmin &&
                        this.createTab('Admin', 2)
                    }
                </Tablist>
            </Pane>
        )
    }
}

export default Navigation;