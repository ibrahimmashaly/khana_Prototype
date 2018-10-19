//
// BlockDam (BCD) based imports
//

import BlockDamToken from '../build/contracts/BlockDamToken.json'
import BondingCurveFunds from '../build/contracts/BlockDamBondingCurveFunds.json'

//
// Update this value so we don't have to transverse the entire blockchain to find events
//

// const contractDeployBlockNumber = 0   // For use when developing
const contractDeployBlockNumber = 3009499   // KHNA Rinkeby deployment block

//
// Shared components
//

import TokenShared from './Shared/_tokenShared';
import Navigation from './Shared/Navigation';
import UserDashboard from './Shared/UserDashboard';
import TokenInformation from './Shared/TokenInformation';
import Admin from './Shared/Admin';
import Notifications from './Shared/Notifications';

//
// Styling
//

import './App.css'

//
// Other
//

import React, { Component } from 'react'

class App extends Component {

    tokenContract;
    bondingCurveContract;
    
    constructor(props) {
        super(props)

        this.state = { app: { status: "", isLoading: true } }
        const contract = require('truffle-contract')
        this.tokenContract = contract(BlockDamToken)
        this.bondingCurveContract = contract(BondingCurveFunds)
    }

    async componentWillMount() {
        // Setup default state values
        let defaultState = await TokenShared.setupDefaultState()
        this.setState(defaultState)

        // Setup web3 instance
        let web3Instance = await TokenShared.setupWeb3()
        if (web3Instance instanceof Error) {
            this.updateLoadingMessage(web3Instance.toString())
            return
        }
        this.setState({web3: web3Instance.web3})

        // Instantiate contract
        TokenShared.setupContracts(this.state, web3Instance.web3, this.tokenContract, this.bondingCurveContract, contractDeployBlockNumber, this.callbackSetState)        
    }

    // Used by other components to update parent state including contracts
    updateState = async (message) => {
        TokenShared.updateState(this.state, this.callbackSetState, message)
    }

    // Update state (without live data from contracts)
    updateStaticState = async (state) => {
        this.setState(state)
    }

    // Updates loading / status message
    updateLoadingMessage = async(message) => {
        let appState = this.state.app
        appState.status = message
        appState.isLoading = true
        this.setState({ app: appState })
        if (message !== '') {
            console.log(message)
        }
    }

    // Should only be called when updating the state from within parent
    // For updating state from children, use updateState or updateStaticState
    callbackSetState = async (state, error, refreshState) => {
        if (error != null) {
            console.log("Shit, an error: " + error)
            this.updateLoadingMessage(error.toString())
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
                        updateStaticState={ this.updateStaticState }
                    />

                    <main className="container">
                        { /* User dashboard section */}
                        {this.state.navigation === 0 &&
                            <UserDashboard
                                user={this.state.user}
                                contract={this.state.contract}
                                web3={this.state.web3}
                                updateStaticState={this.updateStaticState}
                                updateState={this.updateState}
                                updateLoadingMessage={this.updateLoadingMessage}
                            />
                        }

                        { /* Token information section */}
                        {this.state.navigation === 1 &&
                            <TokenInformation
                                contract={this.state.contract}
                                updateLoadingMessage={this.updateLoadingMessage}
                                updateStaticState={this.updateStaticState}
                                updateState={this.updateState}
                            />
                        }

                        { /* Admin section */}
                        {this.state.navigation === 2 &&
                            <Admin
                                state={this.state}
                                updateState={this.updateState}
                                updateLoadingMessage={this.updateLoadingMessage}
                            />
                        }

                        <Notifications
                            state={this.state}
                            message={this.state.app.status}
                            updateStaticState={this.updateStaticState}
                        />

                    </main>
                </div >
            ) }
            </div>
        );
        
    }
}

export default App
