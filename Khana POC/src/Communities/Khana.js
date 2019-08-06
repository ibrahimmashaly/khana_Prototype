import KhanaToken from '../../build/contracts/KhanaToken.json'
import BondingCurveFunds from '../../build/contracts/BondingCurveFunds.json'

import Dapp from '../Shared/Dapp'
import React, { Component } from 'react'

class App extends Component {

    // Update this value so we don't have to transverse the entire blockchain to find events
    contractDeployBlockNumber = 0 //3009494 // KHNA on Rinkeby
    grantsUrl = "https://github.com/mrdavey/KhanaFramework/projects/1"

    render() {
        return (
            <Dapp
                token={KhanaToken}
                bondingCurve={BondingCurveFunds}
                startingBlock={this.contractDeployBlockNumber}
                grantsUrl={this.grantsUrl}
            />
        )
    }
}

export default App
