
var KhanaToken = artifacts.require("./KhanaToken.sol");
var BondingCurveFunds = artifacts.require("./BondingCurveFunds.sol");

contract('KhanaToken', function(accounts) {
    const owner = accounts[0]
    const alice = accounts[1]
    const bob = accounts[2]
    var bobBalance = 0

    let khana
    let fundsContract
    let timeStamp

    const ipfsHash = "QmThisIsATestIpfsHash"

    beforeEach('setup contract for each test', async () => {
        khana = await KhanaToken.deployed()
        timeStamp = Date.now()
    });

    it("should not yet be admin", async () => {
        const aliceNotAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceNotAdmin, false, 'user should not be an admin');
    });

    it("should be able to set new admin (as owner)", async () => {
        await khana.addAdmin(alice, ipfsHash, timeStamp, {from: owner});
        const AdminAdded = await khana.LogAdminAdded();
        const log = await new Promise((resolve, reject) => {
            AdminAdded.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, alice, "AdminAdded event account address incorrectly emitted");
        assert.equal(log.args.ipfsHash, ipfsHash, "AdminAdded event ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        const aliceIsAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceIsAdmin, true, 'user should be an admin');
    });

    it("should be able to award new tokens (as owner)", async () => {
        bobBalance += 10000000000000000000
        await khana.award(bob, 10000000000000000000, ipfsHash, timeStamp, {from: owner});
        const Awarded = await khana.LogAwarded();
        const log = await new Promise ((resolve, reject) => {
            Awarded.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {awardedTo: bob, minter: owner, amount: 10000000000000000000, ipfsHash: ipfsHash};

        const logAccountAddress = log.args.awardedTo;
        const logMinterAddress = log.args.minter;
        const logAmount = log.args.amount.toNumber();
        const logIpfsHash = log.args.ipfsHash;

        assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
        assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");
    });

    it("should be able to award new tokens (as new admin)", async () => {
        bobBalance += 10000000000000000000
        await khana.award(bob, 10000000000000000000, ipfsHash, timeStamp, {from: alice});
        const Awarded = await khana.LogAwarded();
        const log = await new Promise ((resolve, reject) => {
            Awarded.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {awardedTo: bob, minter: alice, amount: 10000000000000000000, ipfsHash: ipfsHash};

        const logAccountAddress = log.args.awardedTo;
        const logMinterAddress = log.args.minter;
        const logAmount = log.args.amount.toNumber();
        const logIpfsHash = log.args.ipfsHash;

        assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
        assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");
    });

    it("should be able to set new admin (as new admin)", async () => {
        await khana.addAdmin(bob, ipfsHash, timeStamp, {from: alice});
        const AdminAdded = await khana.LogAdminAdded();
        const log = await new Promise((resolve, reject) => {
            AdminAdded.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, bob, "AdminAdded event account address incorrectly emitted");
        assert.equal(log.args.ipfsHash, ipfsHash, "AdminAdded event ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        const bobIsAdmin = await khana.checkIfAdmin(bob);
        assert.equal(bobIsAdmin, true, 'user should be an admin');
    });

    it("should be able to remove admin (as new admin)", async () => {
        await khana.removeAdmin(bob, ipfsHash, timeStamp, {from: alice});
        const AdminRemoved = await khana.LogAdminRemoved();
        const log = await new Promise((resolve, reject) => {
            AdminRemoved.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, bob, "AdminRemoved event account address incorrectly emitted");
        assert.equal(log.args.ipfsHash, ipfsHash, "AdminRemoved event ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        const bobIsNotAdmin = await khana.checkIfAdmin(bob);
        assert.equal(bobIsNotAdmin, false, 'user should not be an admin');
    });

    it("should not be able to remove original owner (as new admin)", async () => {
        let revertError;
        try {
            await khana.removeAdmin(owner, ipfsHash, timeStamp, {from: alice});
        } catch (error) {
            revertError = error;
        }
        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to award any more tokens (emergency stop)", async () => {
        await khana.emergencyStop(ipfsHash, timeStamp, {from: owner});
        const ContractDisabled = await khana.LogContractDisabled();
        const log = await new Promise((resolve, reject) => {
            ContractDisabled.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.ipfsHash, ipfsHash, "Emergency stop ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        // Try to award Bob tokens

        let revertError;
        try {
            await khana.award(bob, 100, ipfsHash, timeStamp, {from: owner});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to sell any more tokens (emergency stop)", async () => {
        let revertError;
        try {
            await khana.sell(100, {from: bob});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to call functions of funds contract (when in emergency stop)", async () => {
        fundsContract = await BondingCurveFunds.deployed();

        let revertError;
        try {
            await fundsContract.setTokenContract(alice, timeStamp, {from: owner});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should be able restore awarding of tokens (contract enabled)", async () => {
        await khana.resumeContract(ipfsHash, timeStamp, {from: owner});
        const ContractEnabled = await khana.LogContractEnabled();
        const log = await new Promise((resolve, reject) => {
            ContractEnabled.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.ipfsHash, ipfsHash, "Resume ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        // Now award the tokens to Bob

        bobBalance += 10000000000000000000
        await khana.award(bob, 10000000000000000000, ipfsHash, timeStamp, {from: owner});
        const Awarded = await khana.LogAwarded();
        const logAward = await new Promise ((resolve, reject) => {
            Awarded.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {awardedTo: bob, minter: owner, amount: 10000000000000000000, ipfsHash: ipfsHash};

        const logAccountAddress = logAward.args.awardedTo;
        const logMinterAddress = logAward.args.minter;
        const logAmount = logAward.args.amount.toNumber();
        const logIpfsHash = logAward.args.ipfsHash;

        assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
        assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");
    });

    it("should be able to fund bonding curve by sending ETH (contract enabled)", async () => {
        await khana.resumeContract(ipfsHash, timeStamp, {from: owner});
        const ContractEnabled = await khana.LogContractEnabled();
        const log = await new Promise((resolve, reject) => {
            ContractEnabled.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.ipfsHash, ipfsHash, "Resume contract ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        // Fund the contract with 10 ETH (this should forward to the funding contract)
        await khana.sendTransaction({from: owner, value: 10000000000000000000});

        fundsContract = await BondingCurveFunds.deployed();
        const tokenContractFunding = await fundsContract.LogFundingReceived();
        const logs = await new Promise ((resolve, reject) => {
            tokenContractFunding.watch((error, log) => { resolve(log);});
        })
        const expectedEventResult = {account: khana.address, amount: 10000000000000000000};

        const logAccountAddress = logs.args.account;
        const logAmount = logs.args.amount;

        assert.equal(expectedEventResult.account, logAccountAddress, "Funding received event account property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Funding received event amount property not emitted correctly, check award method");
    });

    it("should be able to sell tokens (contract enabled)", async () => {
        fundsContract = await BondingCurveFunds.deployed();

        // Work out how much ETH we should get in return
        const amountToSell = 10000000000000000000;
        const totalSupply = (await khana.getSupply()).toNumber();
        const ethInContract = web3.eth.getBalance(fundsContract.address);
        const expectedEthReturn = (amountToSell / totalSupply) * (ethInContract * 0.5);

        bobBalance -= amountToSell;
        await khana.sell(amountToSell, {from: bob});

        const Sell = await khana.LogSell();
        const logSell = await new Promise ((resolve, reject) => {
            Sell.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {sellingAccount: bob, sellAmount: amountToSell, ethReceived: expectedEthReturn};

        const logSellingAccount = logSell.args.sellingAccount;
        const logSellAmount = logSell.args.sellAmount.toNumber();
        const logEthReturned = logSell.args.ethReceived.toNumber();

        assert.equal(expectedEventResult.sellingAccount, logSellingAccount, "Sell event sellingAccount property not emitted correctly, check Sell method");
        assert.equal(expectedEventResult.sellAmount, logSellAmount, "Sell event sellAmount property not emitted correctly, check Sell method");
        assert.equal(expectedEventResult.ethReceived, logEthReturned, "Sell event ethReceived property not emitted correctly, check Sell method");
    });

    it("should be able to remove admin (as owner)", async () => {
        await khana.removeAdmin(alice, ipfsHash, timeStamp, {from: owner});
        const AdminRemoved = await khana.LogAdminRemoved();
        const log = await new Promise((resolve, reject) => {
            AdminRemoved.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, alice, "AdminRemoved event account address incorrectly emitted");
        assert.equal(log.args.ipfsHash, ipfsHash, "AdminRemoved event ipfsHash incorrectly emitted");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        const aliceIsNotAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceIsNotAdmin, false, 'user should not be an admin');
    });

    it("should be able to check supply accurately", async () => {
        const supply = (await khana.getSupply()).toNumber();
        const initialSupply = 0;

        const expectedSupply = bobBalance + initialSupply;
        assert.equal(supply, expectedSupply, "token supply did not return the expected result");
    });

    it("should be able to burn tokens (as owner)", async () => {
        await khana.burn(bob, bobBalance, ipfsHash, timeStamp, {from: owner});

        const Burned = await khana.LogBurned();
        const log = await new Promise((resolve, reject) => {
            Burned.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = { burnFrom: bob, amount: bobBalance, ipfsHash: ipfsHash }

        const logBurnFromAddress = log.args.burnFrom;
        const logAmount = log.args.amount.toNumber();
        const logIpfsHash = log.args.ipfsHash;

        assert.equal(expectedEventResult.burnFrom, logBurnFromAddress, "Burn event from property not emitted correctly, check burn method");
        assert.equal(expectedEventResult.amount, logAmount, "Burn event value property not emitted correctly, check burn method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Burn event ipfsHash not emitted correctly, check burn method");
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        // balanceOf function is inherited from StandardToken.sol
        const bobsNewBalance = (await khana.balanceOf(bob)).toNumber();
        assert.equal(bobsNewBalance, 0, "user should not have any tokens remaining");
    });

    it("should be able to award in bulk (same award)", async () => {
        const balanceBefore = (await khana.balanceOf(bob)).toNumber()

        let addresses = [];
        let singleAwardsGas = 0;
        const amount = web3.toWei("10", "szabo")
        const numAwards = 10;
        for (i = 0; i < numAwards; i++) {
            addresses.push(bob);
            let tx = await khana.award(bob, amount, ipfsHash, timeStamp);
            let receipt = await web3.eth.getTransactionReceipt(tx.tx);
            singleAwardsGas = singleAwardsGas + receipt.gasUsed;
        }

        let tx = await khana.awardBulk(addresses, [amount], ipfsHash, timeStamp);
        let receipt = await web3.eth.getTransactionReceipt(tx.tx);
        let bulkAwardsGas = receipt.gasUsed;

        // See how much bulk is more gas-efficient than single awards
        // console.log(`Bulk award is ${singleAwardsGas/bulkAwardsGas} times more gas-efficient for ${numAwards} awards`);

        const BulkAwardedSummary = await khana.LogBulkAwardedSummary();
        const logBulkAwardedSummary = await new Promise((resolve, reject) => {
            BulkAwardedSummary.watch((error, log) => { resolve(log);});
        });

        assert.equal(numAwards, logBulkAwardedSummary.args.bulkCount, "Not all addresses were awarded in bulk transaction, check awardBulk method")
        assert.equal(ipfsHash, logBulkAwardedSummary.args.ipfsHash, "Bulk award event ipfsHash not emitted correctly, check awardBulk method")
        assert.equal(logBulkAwardedSummary.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        const expectedBalanceDiff = 2 * (numAwards * web3.toWei("10", "szabo"))
        const balanceAfter = (await khana.balanceOf(bob)).toNumber()
        assert.equal(expectedBalanceDiff, balanceAfter - balanceBefore, "Expected different balance from bulk awards")
    });

    it("should be able to award in bulk (different awards)", async () => {
        const balanceBeforeOwner = (await khana.balanceOf(owner)).toNumber()
        const balanceBeforeAlice = (await khana.balanceOf(alice)).toNumber()
        const balanceBeforeBob = (await khana.balanceOf(bob)).toNumber()

        const amountForOwner = web3.toWei("10", "szabo")
        const amountForAlice = web3.toWei("100", "szabo")
        const amountForBob = web3.toWei("40", "szabo")

        let addresses = [owner, alice, bob];

        // 1. Should revert when address.length !== amounts.length && amounts.length > 1
        let amounts = [amountForOwner, amountForAlice]

        let revertError;
        try {
            await khana.awardBulk(addresses, amounts, ipfsHash, timeStamp);
        } catch (error) {
            revertError = error;
        }
        assert(revertError, "Expected bulkAward error but did not get one");

        // 2. Should succeed when lengths are the same
        amounts.push(amountForBob);
        let tx = await khana.awardBulk(addresses, amounts, ipfsHash, timeStamp);

        const BulkAwardedSummary = await khana.LogBulkAwardedSummary();
        const log = await new Promise((resolve, reject) => {
            BulkAwardedSummary.watch((error, log) => { resolve(log); });
        });

        assert.equal(amounts.length, log.args.bulkCount, "Not all addresses were awarded in bulk transaction, check awardBulk method")
        assert.equal(ipfsHash, log.args.ipfsHash, "Bulk award event ipfsHash not emitted correctly, check awardBulk method")
        assert.equal(log.args.timeStamp, timeStamp, "timeStamp incorrectly emitted");

        const balanceAfterOwner = (await khana.balanceOf(owner)).toNumber()
        const balanceAfterAlice = (await khana.balanceOf(alice)).toNumber()
        const balanceAfterBob = (await khana.balanceOf(bob)).toNumber()
        
        // 3. Check the correct awards were given
        assert.equal(balanceAfterOwner - balanceBeforeOwner, amountForOwner, "Owner bulk award amount incorrect")
        assert.equal(balanceAfterAlice - balanceBeforeAlice, amountForAlice, "Alice bulk award amount incorrect")
        assert.equal(balanceAfterBob - balanceBeforeBob, amountForBob, "Bob bulk award amount incorrect")
    });

    // it("should be able to correct log IPFS events", async () => {

    // })

})
