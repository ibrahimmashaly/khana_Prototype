var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonic = "SECRET_CODE";

module.exports = {
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  },

  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545, // Ganache
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/v3/INFURA_ID"),
      network_id: 4,
      gas: 7000000,
      skipDryRun: true,
    }
  },

  // Comment out the following if you are running tests locally and need to see the result
  // in terminal.
  // We need this section when committing to Github to have test results shown properly with
  // CI on Azure
  mocha: {
    reporter: "mocha-junit-reporter",
    reporterOptions: {
      mochaFile: 'truffle-test-results.xml'
    }
  }
};
