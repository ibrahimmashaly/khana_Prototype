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

import TokenSetup from './Shared/_tokenSetup';
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

        const contract = require('truffle-contract')
        this.tokenContract = contract(BlockDamToken)
        this.bondingCurveContract = contract(BondingCurveFunds)
    }

    async componentWillMount() {

        // Setup default state values
        let defaultState = await TokenSetup.setupDefaultState()
        this.setState(defaultState)

        // Setup web3 instance
        let web3Instance = await TokenSetup.setupWeb3()
        this.setState({web3: web3Instance.web3})

        // Instantiate contract
        TokenSetup.setupContracts(this.state.web3, this.tokenContract, this.bondingCurveContract, contractDeployBlockNumber)
        .then((updatedState) => {
            this.setState(updatedState)
            console.log(updatedState)
        })
    }
    

    // // Updates state and gets live data from contracts
    // updateState = async (message) => {
    //     let web3 = this.state.web3
    //     let khanaTokenInstance = this.state.contract.instance
    //     let accounts = this.state.user.accounts
    //     let fundsInstance = this.state.contract.fundsInstance
    //     var supply
    //     var tokenBalance

    //     khanaTokenInstance.getSupply.call().then((newSupply) => {
    //         supply = (web3.fromWei(newSupply, 'ether')).toString(10);
    //         return khanaTokenInstance.balanceOf(accounts[0])
    //     }).then((newBalance) => {
    //         tokenBalance = (web3.fromWei(newBalance, 'ether')).toString(10);
    //         return khanaTokenInstance.contractEnabled()
    //     }).then((contractStatus) => {

    //         web3.eth.getBalance(fundsInstance.address, (err, result) => {
    //             let state = this.state
    //             state.contract.totalSupply = supply
    //             state.contract.address = khanaTokenInstance.address
    //             state.contract.contractEnabled = contractStatus
    //             state.contract.ethAmount = (web3.fromWei(result, 'ether')).toString(10);
    //             state.user.currentAddress = accounts[0]
    //             state.user.tokenBalance = tokenBalance
    //             state.app.status = message ? message : ''
    //             state.app.isLoading = false

    //             return this.setState(state)
    //         })

    //     }).catch((error) => {
    //         console.log(error)
    //     })

    //     if (this.state.user.isAdmin && this.state.navigation === 2) {
    //         document.getElementById("awardButton").disabled = false;
    //     }

    //     if (message) {
    //         console.log(message);
    //     }
    // }

    // // Update state (without live data from contracts)
    // updateStaticState = async (state) => {
    //     this.setState(state)
    // }

    // // Updates loading / status message
    // updateLoadingMessage = async(message) => {
    //     let appState = this.state.app
    //     appState.status = message
    //     appState.isLoading = true
    //     this.setState({ app: appState })
    //     if (message !== '') {
    //         console.log(message)
    //     }
    // }

    render() {
        return (
            <div>hello 

            </div>
            // <div className="App">
            //     <Navigation 
            //         state={this.state}
            //         updateStaticState={this.updateStaticState}
            //         />

            //     <main className="container">
            //         { /* User dashboard section */}
            //         { this.state.navigation === 0 &&
            //             <UserDashboard 
            //                 user={this.state.user} 
            //                 contract={this.state.contract} 
            //                 web3={this.state.web3} 
            //                 updateStaticState={this.updateStaticState} 
            //                 updateState={this.updateState} 
            //                 updateLoadingMessage={this.updateLoadingMessage}
            //                 />
            //         }

            //         { /* Token information section */}
            //         { this.state.navigation === 1 &&
            //             <TokenInformation 
            //                 contract={this.state.contract} 
            //                 updateLoadingMessage={this.updateLoadingMessage}
            //                 updateStaticState={this.updateStaticState}
            //                 updateState={this.updateState} 
            //                 />
            //         }

            //         { /* Admin section */}
            //         { this.state.navigation === 2 &&
            //             <Admin 
            //                 state={this.state} 
            //                 updateState={this.updateState} 
            //                 updateLoadingMessage={this.updateLoadingMessage} 
            //                 />
            //         }
            
            //         <Notifications 
            //             state={this.state}
            //             message={this.state.app.status} 
            //             updateStaticState={this.updateStaticState} 
            //             />

            //     </main>
            // </div>
        );
    }
}

export default App
