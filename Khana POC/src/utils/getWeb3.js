import Web3 from 'web3'

let getWeb3 = new Promise((resolve, reject) => {
  window.addEventListener("load", async () => {
    // Modern dapp browsers...
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        // Request account access if needed
        await window.ethereum.enable();
        // Acccounts now exposed, get correct network
        web3.version.getNetwork((err, netId) => {
          if(Number(netId) !== 4 && Number(netId) < 99) { // Let us work in development chains (usually > 100)
            resolve(Error("Wrong network selected. We are only live on Rinkeby! Please switch 🙏"))
          } else {
            resolve(web3)
          }
        })
      } catch (error) {
        reject(error);
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      // Use Mist/MetaMask's provider.
      const web3 = window.web3;
      console.log("Injected web3 detected.");
      resolve(web3);
    }
    else {
      // No web3 provider available!
      resolve(Error("No Web3 provider detected! 😩 Try loading with a different browser or Metamask"))
    }
  });
});

export default getWeb3;