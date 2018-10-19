import TokenShared from './DappTokenShared';
import '../App.css'

import React, { Component } from 'react';
import Navigation from './Navigation';
import UserDashboard from './UserDashboard';
// import TokenInformation from './TokenInformation';
// import Admin from './Admin';
// import Notifications from './Notifications';

class Dapp extends Component {

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
        TokenShared.setupContracts(this.state, web3Instance.web3, this.tokenContract, this.bondingCurveContract, this.props.startingBlock, this.callbackSetState)        
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
                        updateStaticState={this.updateStaticState}
                    />

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
                    
                </div >
            ) }
            </div>
        );
    }
}

export default Dapp




                    //     <main className="container">
                    //     { /* User dashboard section */}
                    //     {this.state.navigation === 0 &&
                    //         <UserDashboard
                    //             user={this.state.user}
                    //             contract={this.state.contract}
                    //             web3={this.state.web3}
                    //             updateStaticState={this.updateStaticState}
                    //             updateState={this.updateState}
                    //             updateLoadingMessage={this.updateLoadingMessage}
                    //         />
                    //     }

                    //     { /* Token information section */}
                    //     {this.state.navigation === 1 &&
                    //         <TokenInformation
                    //             contract={this.state.contract}
                    //             updateLoadingMessage={this.updateLoadingMessage}
                    //             updateStaticState={this.updateStaticState}
                    //             updateState={this.updateState}
                    //         />
                    //     }

                    //     { /* Admin section */}
                    //     {this.state.navigation === 2 &&
                    //         <Admin
                    //             state={this.state}
                    //             updateState={this.updateState}
                    //             updateLoadingMessage={this.updateLoadingMessage}
                    //         />
                    //     }

                    //     <Notifications
                    //         state={this.state}
                    //         message={this.state.app.status}
                    //         updateStaticState={this.updateStaticState}
                    //     />

                    // </main>