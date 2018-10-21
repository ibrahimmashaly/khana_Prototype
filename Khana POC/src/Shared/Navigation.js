import React, { Component } from 'react';

import { Pane, Heading, Tablist, Tab, Spinner } from 'evergreen-ui'

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
                <Pane display="flex" padding={16}>
                    {this.props.state.app.isLoading &&
                    <Pane alignItems="center">
                        <Spinner size={24} /> 
                    </Pane>
                    }
                    <Pane>
                        <Heading size={100}>Khana Framework: 📈 <strong>{this.props.state.contract.tokenName} ({this.props.state.contract.tokenSymbol})</strong></Heading>
                    </Pane>
                </Pane>
                <Tablist marginBottom={8} flexBasis={240} marginRight={24}>
                    {this.createTab('Dashboard', 0)}
                    {this.createTab('Grants', 1)}
                    {this.createTab('Grant History', 2)}
                    {this.props.state.user.isAdmin &&
                        this.createTab('Admin', 3)
                    }
                </Tablist>
            </Pane>
        )
    }
}

export default Navigation;