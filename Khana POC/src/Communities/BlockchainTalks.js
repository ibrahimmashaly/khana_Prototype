import BlockchainTalksToken from "../../build/contracts/BlockchainTalksToken.json";
import BondingCurveFunds from "../../build/contracts/BlockchainTalksBondingCurveFunds.json";

import Dapp from '../Shared/Dapp'
import React, { Component } from 'react'

class App extends Component {
	// Update this value so we don't have to transverse the entire blockchain to find events
    contractDeployBlockNumber = 4180117; // BCT on Rinkeby
	grantsUrl = "https://blockchaintalks.io/";

	render() {
		return (
            <Dapp token={BlockchainTalksToken} bondingCurve={BondingCurveFunds} startingBlock={this.contractDeployBlockNumber} grantsUrl={this.grantsUrl} />
		);
	}
}

export default App
