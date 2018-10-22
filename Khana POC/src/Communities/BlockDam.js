import BlockDamToken from '../../build/contracts/BlockDamToken.json'
import BondingCurveFunds from '../../build/contracts/BlockDamBondingCurveFunds.json'

import Dapp from '../Shared/Dapp'
import React, { Component } from 'react'

class App extends Component {

    // Update this value so we don't have to transverse the entire blockchain to find events
    contractDeployBlockNumber = 3009494 // KHNA on Rinkeby
    grantsUrl = "https://www.meetup.com/Permissionless-Society/"

    render() {
        return (
            <Dapp
                token={BlockDamToken}
                bondingCurve={BondingCurveFunds}
                startingBlock={this.contractDeployBlockNumber}
                grantsUrl={this.grantsUrl}
            />
        )
    }
}

export default App
