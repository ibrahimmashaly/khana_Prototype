var KhanaToken = artifacts.require("./KhanaToken.sol");

contract('KhanaToken', function(accounts) {
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    var bobBalance = 0;

    it("should not yet be admin", async () => {
        const khana = await KhanaToken.deployed();

        const aliceNotAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceNotAdmin, false, 'user should not be an admin');
    });

    it("should be able to set new admin (as owner)", async () => {
        const khana = await KhanaToken.deployed();

        await khana.addAdmin(alice, {from: owner});
        const AdminAdded = await khana.AdminAdded();
        const log = await new Promise((resolve, reject) => {
            AdminAdded.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, alice, "AdminAdded event account address incorrectly emitted");

        const aliceIsAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceIsAdmin, true, 'user should be an admin');
    });

    it("should be able to award new tokens (as owner)", async () => {
        const khana = await KhanaToken.deployed();

        bobBalance += 10000000000000000000
        await khana.award(bob, 10000000000000000000, "ipfsHash_placeholder", {from: owner});
        const Awarded = await khana.Awarded();
        const log = await new Promise ((resolve, reject) => {
            Awarded.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {awardedTo: bob, minter: owner, amount: 10000000000000000000, ipfsHash: "ipfsHash_placeholder"};

        const logAccountAddress = log.args.awardedTo;
        const logMinterAddress = log.args.minter;
        const logAmount = log.args.amount.toNumber();
        const logIpfsHash = log.args.ipfsHash;

        assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
        assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
    });

    it("should be able to award new tokens (as new admin)", async () => {
        const khana = await KhanaToken.deployed();

        bobBalance += 10000000000000000000
        await khana.award(bob, 10000000000000000000, "ipfsHash_placeholder", {from: alice});
        const Awarded = await khana.Awarded();
        const log = await new Promise ((resolve, reject) => {
            Awarded.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {awardedTo: bob, minter: alice, amount: 10000000000000000000, ipfsHash: "ipfsHash_placeholder"};

        const logAccountAddress = log.args.awardedTo;
        const logMinterAddress = log.args.minter;
        const logAmount = log.args.amount.toNumber();
        const logIpfsHash = log.args.ipfsHash;

        assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
        assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
    });

    it("should be able to set new admin (as new admin)", async () => {
        const khana = await KhanaToken.deployed();

        await khana.addAdmin(bob, {from: alice});
        const AdminAdded = await khana.AdminAdded();
        const log = await new Promise((resolve, reject) => {
            AdminAdded.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, bob, "AdminAdded event account address incorrectly emitted");

        const bobIsAdmin = await khana.checkIfAdmin(bob);
        assert.equal(bobIsAdmin, true, 'user should be an admin');
    });

    it("should be able to remove admin (as new admin)", async () => {
        const khana = await KhanaToken.deployed();

        await khana.removeAdmin(bob, {from: alice});
        const AdminRemoved = await khana.AdminRemoved();
        const log = await new Promise((resolve, reject) => {
            AdminRemoved.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, bob, "AdminRemoved event account address incorrectly emitted");

        const bobIsNotAdmin = await khana.checkIfAdmin(bob);
        assert.equal(bobIsNotAdmin, false, 'user should not be an admin');
    });

    it("should not be able to remove original owner (as new admin)", async () => {
        const khana = await KhanaToken.deployed();
        let revertError;
        try {
            await khana.removeAdmin(owner, {from: alice});
        } catch (error) {
            revertError = error;
        }
        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to award any more tokens (emergency stop)", async () => {
        const khana = await KhanaToken.deployed();

        // Hit the emergecy stop

        await khana.emergencyStop({from: owner});
        const MintFinished = await khana.MintFinished();
        const log = await new Promise((resolve, reject) => {
            MintFinished.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.event, 'MintFinished', "Emergency stop event event incorrectly emitted");

        // Try to award Bob tokens

        let revertError;
        try {
            await khana.award(bob, 100, "ipfsHash_placeholder", {from: owner});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should be able restore awarding of tokens (disable emergecy stop)", async () => {
        const khana = await KhanaToken.deployed();

        // Resume minting process

        await khana.resumeMinting({from: owner});
        const MintingEnabled = await khana.MintingEnabled();
        const log = await new Promise((resolve, reject) => {
            MintingEnabled.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.event, 'MintingEnabled', "Resume minting event incorrectly emitted");

        // Now award the tokens to Bob

        bobBalance += 10000000000000000000
        await khana.award(bob, 10000000000000000000, "ipfsHash_placeholder", {from: owner});
        const Awarded = await khana.Awarded();
        const logAward = await new Promise ((resolve, reject) => {
            Awarded.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {awardedTo: bob, minter: owner, amount: 10000000000000000000, ipfsHash: "ipfsHash_placeholder"};

        const logAccountAddress = logAward.args.awardedTo;
        const logMinterAddress = logAward.args.minter;
        const logAmount = logAward.args.amount.toNumber();
        const logIpfsHash = logAward.args.ipfsHash;

        assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
        assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
    });

    it("should be able to remove admin (as owner)", async () => {
        const khana = await KhanaToken.deployed();

        await khana.removeAdmin(alice, {from: owner});
        const AdminRemoved = await khana.AdminRemoved();
        const log = await new Promise((resolve, reject) => {
            AdminRemoved.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.args.account, alice, "AdminRemoved event account address incorrectly emitted");

        const aliceIsNotAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceIsNotAdmin, false, 'user should not be an admin');
    });

    it("should be able to check supply accurately", async () => {
        const khana = await KhanaToken.deployed();

        const supply = (await khana.getSupply()).toNumber();
        const initialSupply = (await khana.INITIAL_SUPPLY()).toNumber();

        const expectedSupply = bobBalance + initialSupply;
        assert.equal(supply, expectedSupply, "token supply did not return the expected result");
    });

    it("should be able to burn tokens (as owner)", async () => {
        const khana = await KhanaToken.deployed();

        await khana.burn(bob, bobBalance, {from: owner});

        // Transfer event is emitted in StandardToken.sol, with the event detailed in ERC20.sol
        const Transfer = await khana.Transfer();
        const log = await new Promise((resolve, reject) => {
            Transfer.watch((error, log) => { resolve(log);});
        });

        const expectedEventResult = {from: bob, to: '0x0000000000000000000000000000000000000000', value: bobBalance}

        const logFromAddress = log.args.from;
        const logToAddress = log.args.to;
        const logvalue = log.args.value.toNumber();

        assert.equal(expectedEventResult.from, logFromAddress, "Burn event from property not emitted correctly, check burn method");
        assert.equal(expectedEventResult.to, logToAddress, "Burn event to property not emitted correctly, check burn method");
        assert.equal(expectedEventResult.value, logvalue, "Burn event value property not emitted correctly, check burn method");

        // balanceOf function is inherited from StandardToken.sol
        const bobsNewBalance = (await khana.balanceOf(bob)).toNumber();
        assert.equal(bobsNewBalance, 0, "user should not have any tokens remaining");
    });

})