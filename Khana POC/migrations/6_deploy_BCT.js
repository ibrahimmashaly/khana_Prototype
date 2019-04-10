var BlockchainTalksToken = artifacts.require("BlockchainTalksToken");
var BlockchainTalksBondingCurveFunds = artifacts.require('BlockchainTalksBondingCurveFunds');

module.exports = function(deployer, network, accounts) {
    let bctInstance
    let bctBondingFundsInstance

    console.log('  === Deploying BlockchainTalks contracts...')

    deployer.deploy(BlockchainTalksToken).then((result) => {
        bctInstance = result

        return deployer.deploy(BlockchainTalksBondingCurveFunds, BlockchainTalksToken.address)
    })
    .then((result) => {
        bctBondingFundsInstance = result

        return bctInstance.setFundsContract(BlockchainTalksBondingCurveFunds.address, Date.now(), {from: accounts[0]})
    })
    .then((result) => {

        // Fund the bonding curve with 'amountOfEthToFund' when deploying in development environment
        let amountOfEthToFund = "2"

        // Truffle calls it 'develop', ganache calls it 'development'
        if (network == 'develop' || network == 'development' || network == 'test') {
            bctBondingFundsInstance.sendTransaction({ from: accounts[9], value: web3.utils.toWei(amountOfEthToFund, 'ether')}).then((result) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... funded with ' + amountOfEthToFund + ' ETH successfully')
            }).catch((error) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... error with funding occured: ' + error.message)
            })
        }
    })
};
