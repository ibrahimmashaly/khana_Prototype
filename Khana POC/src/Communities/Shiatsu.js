import ShiatsuToken from '../../build/contracts/ShiatsuToken.json'
import BondingCurveFunds from '../../build/contracts/ShiatsuBondingCurveFunds.json'

import Dapp from '../Shared/Dapp'
import React, { Component } from 'react'

class App extends Component {

    // Update this value so we don't have to transverse the entire blockchain to find events
    contractDeployBlockNumber = 3470143 // VOS on Rinkeby
    grantsUrl = "http://shiatsuplatform.nl/grants"

    render() {
        return (
            <Dapp
                token={ShiatsuToken}
                bondingCurve={BondingCurveFunds}
                startingBlock={this.contractDeployBlockNumber}
                grantsUrl={this.grantsUrl}
            />
        )
    }
}

export default App
