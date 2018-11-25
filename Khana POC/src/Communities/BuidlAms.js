import BuidlAmsToken from '../../build/contracts/BuidlAmsToken.json'
import BondingCurveFunds from '../../build/contracts/BuidlAmsBondingCurveFunds.json'

import Dapp from '../Shared/Dapp'
import React, { Component } from 'react'

class App extends Component {

    // Update this value so we don't have to transverse the entire blockchain to find events
    contractDeployBlockNumber = 3403078 // BDLAMS on Rinkeby
    grantsUrl = "https://goo.gl/4YMGrW"

    render() {
        return (
            <Dapp
                token={BuidlAmsToken}
                bondingCurve={BondingCurveFunds}
                startingBlock={this.contractDeployBlockNumber}
                grantsUrl={this.grantsUrl}
            />
        )
    }
}

export default App
