import React, { Component } from 'react';
import Modal from 'react-modal'

import { Pane, Heading, Tablist, Tab, Spinner, Alert, Text } from 'evergreen-ui'

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)'
    }
}

class Navigation extends Component {

    componentDidMount() {

        // This is a bug fix / hack for Coinbase Wallet app - 27/11/2018
        // For some reason, their app does not update the state properly on first load,
        // causing problems on the UserDashboard display of information

        setTimeout(() => {
            let state = this.props.state
            this.props.updateStaticState(state)
        }, 3000)
    }

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
        let blockingError = this.props.state.blockerTitle != null

        return (
            <Pane>
                {blockingError &&
                    <Alert
                        intent="danger"
                        title={this.props.state.blockerTitle}
                    >
                        {this.props.state.blockerDescription}
                </Alert>
                }
                <Pane display="flex" padding={16}>
                    <Modal
                        ariaHideApp={false}
                        isOpen={this.props.state.app.isLoading}
                        // onRequestClose={this.closeModal}
                        style={customStyles}
                        contentLabel={this.props.state.app.status}
                    >
                        <Pane display="flex" alignItems="center" justifyContent="center" marginBottom={16}>
                            <Spinner/>
                        </Pane>
                        <Pane alignItems="center" justifyContent="center">
                            <Heading>{this.props.state.app.status}</Heading>
                            <Text>{this.props.state.app.detailedStatus}</Text>
                        </Pane>

                    </Modal>

                    <Pane>
                        <Heading size={100}>Khana v.0.21: 📈 <strong>{this.props.state.contract.tokenName} ({this.props.state.contract.tokenSymbol})</strong></Heading>
                    </Pane>
                </Pane>
                <Tablist marginBottom={8} flexBasis={240} marginRight={24}>
                    {this.createTab('Dashboard', 0)}
                    {this.createTab('Grants', 1)}
                    {this.createTab('Grant History', 2)}
                    {this.props.state.user.isAdmin &&
                        this.createTab('Admin', 3)
                    }
                    {this.props.state.user.isAdmin &&
                        this.createTab('PoA', 4)
                    }

                    {this.props.state.user.isOwner &&
                        this.createTab('Owner', 5)
                    }
                </Tablist>
            </Pane>
        )
    }
}

export default Navigation;