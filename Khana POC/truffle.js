var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonic = "INSERT_SECRET";

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
        // host: "127.0.0.1",
        // port: 8545,
        provider: () =>
          new HDWalletProvider(mnemonic, "INSERT_INFURA_API"),
        network_id: 4,
        gasPrice: 10000000000
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
