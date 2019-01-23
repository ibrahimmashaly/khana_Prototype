var BuidlAmsToken = artifacts.require("BuidlAmsToken");
var BuidlAmsBondingCurveFunds = artifacts.require('BuidlAmsBondingCurveFunds');

module.exports = function(deployer, network, accounts) {
    let bdlInstance
    let bdlBondingFundsInstance

    console.log('  === Deploying BuidlAms contracts...')

    deployer.deploy(BuidlAmsToken).then((result) => {
        bdlInstance = result

        return deployer.deploy(BuidlAmsBondingCurveFunds, BuidlAmsToken.address)
    })
    .then((result) => {
        bdlBondingFundsInstance = result

        return bdlInstance.setFundsContract(BuidlAmsBondingCurveFunds.address, Date.now(), {from: accounts[0]})
    })
    .then((result) => {

        // Fund the bonding curve with 'amountOfEthToFund' when deploying in development environment
        let amountOfEthToFund = "2"

        // Truffle calls it 'develop', ganache calls it 'development'
        if (network == 'develop' || network == 'development' || network == 'test') {
            bdlBondingFundsInstance.sendTransaction({from: accounts[9], value: web3.toWei(amountOfEthToFund, 'ether')}).then((result) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... funded with ' + amountOfEthToFund + ' ETH successfully')
            }).catch((error) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... error with funding occured: ' + error.message)
            })
        }
    })
};
