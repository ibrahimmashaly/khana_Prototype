var ShiatsuToken = artifacts.require("ShiatsuToken");
var ShiatsuBondingCurveFunds = artifacts.require('ShiatsuBondingCurveFunds');

module.exports = function(deployer, network, accounts) {
    let vosInstance
    let vosBondingFundsInstance

    console.log('  === Deploying Shiatsu contracts...')

    deployer.deploy(ShiatsuToken).then((result) => {
        vosInstance = result

        return deployer.deploy(ShiatsuBondingCurveFunds, ShiatsuToken.address)
    })
    .then((result) => {
        vosBondingFundsInstance = result

        return vosInstance.setFundsContract(ShiatsuBondingCurveFunds.address, Date.now(), {from: accounts[0]})
    })
    .then((result) => {

        // Fund the bonding curve with 'amountOfEthToFund' when deploying in development environment
        let amountOfEthToFund = "2"

        // Truffle calls it 'develop', ganache calls it 'development'
        if (network == 'develop' || network == 'development' || network == 'test') {
            vosBondingFundsInstance.sendTransaction({from: accounts[9], value: web3.toWei(amountOfEthToFund, 'ether')}).then((result) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... funded with ' + amountOfEthToFund + ' ETH successfully')
            }).catch((error) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... error with funding occured: ' + error.message)
            })
        }
    })
};
