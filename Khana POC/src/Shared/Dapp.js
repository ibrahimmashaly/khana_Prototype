import React, { Component } from 'react'
import { notificationNotify, notificationSuccess, notificationWarning, notificationDanger} from '../utils/helpers'
import Navigation from './Navigation'
import UserDashboard from './UserDashboard'
import Grants from './Grants'
import GrantHistory from './GrantHistory'
import Admin from './Admin';
import TokenShared from './DappTokenShared';

class Dapp extends Component {

    tokenShared = new TokenShared()
    tokenContract;
    bondingCurveContract;
    
    constructor(props) {
        super(props)

        this.state = { app: { status: "", isLoading: true } }
        const contract = require('truffle-contract')
        this.tokenContract = contract(props.token)
        this.bondingCurveContract = contract(props.bondingCurve)
    }

    async componentWillMount() {
        // Setup default state values
        let tokenShared = new TokenShared()
        tokenShared.defaultState.contract.startingBlock = this.props.startingBlock
        let defaultState = await tokenShared.setupDefaultState()
        this.setState(defaultState)

        // Setup web3 instance
        let web3Instance = await TokenShared.setupWeb3()
        if (web3Instance instanceof Error) {
            this.updateLoadingMessage("Something went wrong 🤔", web3Instance.toString(), 4)
            return
        }
        this.setState({web3: web3Instance})

        // Instantiate contract
        TokenShared.setupContracts(this.state, web3Instance, this.tokenContract, this.bondingCurveContract, this.callbackSetState) 
    }

    // Used by other components to refresh parent state including contracts
    updateState = async (message, description, alertLevel) => {
        await TokenShared.updateState(this.state, this.callbackSetState, message)
        this.createNotification(message, description, alertLevel)
    }

    // Update state directly from children
    updateStaticState = async (state) => {
        await this.setState(state)
    }

    // Updates loading / status message
    updateLoadingMessage = async(message, description, alertLevel) => {
        let appState = this.state.app
        appState.status = message
        appState.isLoading = true
        this.setState({ app: appState })
        this.createNotification(message, description, alertLevel)
    }

    createNotification = async (message, description, alertLevel) => {
        // console.log(message, description, alertLevel)
        if (message != null) {
            switch (alertLevel) {
                case 0: notificationNotify(message, description); break
                case 1: notificationSuccess(message, description); break
                case 2: notificationWarning(message, description); break
                case 3: notificationDanger(message, description); break
                case 4: this.setState({blockerTitle: message, blockerDescription: description}); break
                default: notificationNotify(message, description)
            }
        }
    }

    // Should only be called when updating the state from within parent
    // For updating state from children, use updateState or updateStaticState
    callbackSetState = async (state, error, refreshState) => {
        if (error != null) {
            console.log("Shit, an error: " + error)
            this.updateLoadingMessage("Something went wrong 🤔", error.toString(), 4)
            return
        }

        this.setState(state)
        if (refreshState) {
            this.updateState()
        }
    }

    render() {
        const isLoadingFirstTime = this.state.app.isLoading && this.state.user == null

        return (
            <div>
            {isLoadingFirstTime ? (
                <div> Current loading... </div>
            ) : (
                <div className="App">
                    <Navigation
                        state={this.state}
                        updateStaticState={this.updateStaticState}
                    />

                    { /* User dashboard section */}
                    {this.state.navigation === 0 &&
                        <UserDashboard
                            state={this.state}
                            updateStaticState={this.updateStaticState}
                            updateState={this.updateState}
                            updateLoadingMessage={this.updateLoadingMessage}
                        />
                    }

                    { /* Grants section */}
                    {this.state.navigation === 1 &&
                        <Grants
                            state={this.state}
                            updateStaticState={this.updateStaticState}
                            updateState={this.updateState}
                            updateLoadingMessage={this.updateLoadingMessage}
                            grantsUrl={this.props.grantsUrl}
                        />
                    }

                     { /* Grant History section */}
                    {this.state.navigation === 2 &&
                        <GrantHistory
                            state={this.state}
                            updateLoadingMessage={this.updateLoadingMessage}
                            updateStaticState={this.updateStaticState}
                            updateState={this.updateState}
                        />
                    }

                    { /* Admin section */}
                    {this.state.navigation === 3 &&
                        <Admin
                            state={this.state}
                            updateState={this.updateState}
                            updateStaticState={this.updateStaticState}
                            updateLoadingMessage={this.updateLoadingMessage}
                        />
                    }
                    
                </div >
            ) }
            </div>
        );
    }
}

export default Dapp