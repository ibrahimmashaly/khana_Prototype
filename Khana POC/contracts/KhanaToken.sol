pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./BondingCurveFunds.sol";

/**
 * @title Proof of Concept contract for the Khana framework
 * @author David Truong <david@truong.vc>
 * @dev This is a mintable token with a group of admins who can mint them (i.e.
 * award them) to community members, record the IPFS hash of the reasons associated
 * with each minting, and a simple bonding curve where token holders can redeem
 * ETH for tokens they've received.
 * For more information, see: https://khana.io
 */

contract KhanaToken is MintableToken {
    using SafeMath for uint256;

    uint32  private constant BULK_AWARD_MAX_COUNT = 100;

    string public name = "KhanaToken";
    string public symbol = "KHNA";
    uint8 public decimals = 18;

    // Minimum ETH contract should have to enable bonding curve
    uint public minimumEthBalance = 1 ether;

    bool public contractEnabled = true;

    address public fundsContract;

    mapping (address => bool) public adminAccounts;

    event LogContractDisabled(
        address adminAddress,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogContractEnabled(
        address adminAddress,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogAdminAdded(
        address indexed account,
        address adminAddress,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogAdminRemoved(
        address indexed account,
        address adminAddress,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogAwarded(
        address indexed awardedTo,
        address indexed minter,
        uint256 amount,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogBulkAwardedFailure(
        address failed,
        uint256 amount
    );
    event LogBulkAwardedSummary(
        uint bulkCount,
        address indexed minter,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogSell(
        address sellingAccount,
        uint256 sellAmount,
        uint256 ethReceived
    );
    event LogFundsContractChanged(
        address oldContract,
        address newContract,
        uint256 timeStamp
    );
    event LogBurned(
        address indexed burnFrom,
        address adminAddress,
        uint256 amount,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogTokenMigration(
        address indexed caller,
        address indexed oldContract,
        uint256 oldVersion,
        address[] accounts,
        uint256[] amounts,
        string ipfsHash,
        uint256 timeStamp
    );
    event LogBulkAdminAdded(
        address indexed caller,
        address indexed oldContract,
        uint256 oldVersion,
        address[] accounts,
        string ipfsHash,
        uint256 timeStamp
    );

    /**
     * @notice We want a single emitted event to record the most recent ipfs hash
     * @notice Other events also contain the hash for redundancy event checking purposes
     * @notice This could be useful if we want only the most recent IPFS hash instead of
     * transversing all previous events 
     */
    event LogAuditHash(
        string ipfsHash
    );

    /**
     * @dev The owner is automatically set by Ownable.sol. The owner is also added
     * as an admin.
     */
    constructor() public {
        adminAccounts[msg.sender] = true;
    }

    /**
     * @dev Throws if called by a non-admin account.
     */
    modifier onlyAdmins() {
        require(adminAccounts[msg.sender] == true, "Only admins can perform this action");
        _;
    }

    /**
     * @dev Throws if called by a non-admin account.
     * @notice This modifier overrides the modifier of the same name in
     * MintableToken.sol. We want to keep the safety of Zeppelin's mintableToken,
     * but expand the usecase slightly with more admins with mint permissions.
     */
    modifier hasMintPermission() {
        require(adminAccounts[msg.sender] == true, "Only admins can perform this action");
        _;
    }

    /**
     * @dev Throws if called when contract has been disabled via 'emergencyStop()'.
     */
    modifier contractIsEnabled() {
        require(contractEnabled, "Emergency stop is activated");
        _;
    }

    /**
     * @dev Throws if called when contract has been disabled via 'emergencyStop()'.
     */
    modifier fundsContractIsValid() {
        require(fundsContract != address(0), "Invalid funds contract");
        _;
    }

    /**
     * @dev The fallback function, which is used to 'fund' the token for
     * liquidity of the token (see 'sell' function).
     * @notice Anyone can fund the token contract with ETH to increase the 'pot'
     * associated with the token. However this would normally be done by the
     * community organisers, who may send a portion of sponsorship money or ticket
     * sales from community organised events.
     * The 'fundsContract' must be set to a valid address.
     */
    function () public contractIsEnabled payable fundsContractIsValid {
        fundsContract.transfer(msg.value);
    }

    /**
     * @dev Award tokens to users with relevant audit information in an IPFS file.
     * @notice The IPFS hash should always be included with any reward of tokens,
     * to ensure auditing of the minting process can be done at anytime in the future.
     * The event emitted must also specify the IPFS hash so that it is permanently
     * recorded on the blockchain, and that the IPFS hash related to the most up
     * to date audit log can be found easily.
     * We do not want to record the IPFS hashes in an array on the blockchain as
     * it would end up costing too much, hence we 'store' them in emitted event logs.
     * @param _account The address of the user to awarded.
     * @param _amount The amount to be awarded.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current award of tokens.
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function award(
        address _account,
        uint256 _amount,
        string _ipfsHash,
        uint256 _timeStamp
    )
        public
        onlyAdmins
        contractIsEnabled
        returns (bool)
    {
        return _award(_account, _amount, _ipfsHash, _timeStamp, false);
    }

    /**
     * @dev Internal function to award tokens. Admins should always use public award().
     * @notice See public award() notices.
     * @param _account The address of the user to awarded.
     * @param _amount The amount to be awarded.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current award of tokens.
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     * @param _isQuiet Used to indicate whether events should be emitted. Only internal
     * events should have this set to false
     */
    function _award(
        address _account,
        uint256 _amount,
        string _ipfsHash,
        uint256 _timeStamp,
        bool _isQuiet
    )
        internal
        onlyAdmins
        contractIsEnabled
        returns (bool)
    {
        bool success = mint(_account, _amount);

        if (!_isQuiet && success) {
            emit LogAwarded(_account, msg.sender, _amount, _ipfsHash, _timeStamp);
            emit LogAuditHash(_ipfsHash);
        }

        return success;
    }

    /**
     * @dev Does the same action as award() above but performs it as a bulk operation
     * saving gas and improving the throughput.
     * @notice There is an assumption here that the whole bulk of awards comes for a single reason,
     * hence single amount and ipfs hash
     * @notice This is not a 'transactional' award, meaning that if there is 'wrong' address
     * among the ones provided, the whole award will still be successful
     * Approach is inspired by HUMAN Protocol but having better record of failing awards
     * @notice The length of accounts and amounts MUST be not higher than BULK_AWARD_MAX_COUNT
     * @notice _amounts must either be an array of 1 or an array with the same length as accounts
     * @param _accounts The addresses of the users to awarded.
     * @param _amounts The amounts to be awarded to each address.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current awards of tokens.
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function awardBulk(
        address[] _accounts,
        uint256[] _amounts,
        string _ipfsHash,
        uint256 _timeStamp
    )
        public
        onlyAdmins
        contractIsEnabled
        returns (uint)
    {
        return _awardBulk(_accounts, _amounts, _ipfsHash, _timeStamp, false);
    }

    /**
     * @dev Internal bulk awards. Admins should always use public awardBulk(). We
     * don't want admins quietly making awards.
     * @notice See notices in public awardBulk()
     * @param _accounts The addresses of the users to awarded.
     * @param _amounts The amounts to be awarded to each address.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current awards of tokens.
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     * @param _isQuiet Used to indicate whether events should be emitted. Only internal
     * events should have this set to false
     */
    function _awardBulk(
        address[] _accounts,
        uint256[] _amounts,
        string _ipfsHash,
        uint256 _timeStamp,
        bool _isQuiet
    )
        internal
        onlyAdmins
        contractIsEnabled
        returns (uint)
    {
        require(_accounts.length < BULK_AWARD_MAX_COUNT, "Too many accounts");
        require(_amounts.length < BULK_AWARD_MAX_COUNT, "Too many amounts");
        require(_amounts.length == 1 || _amounts.length == _accounts.length, "Invalid amounts given");
        
        bool sameBulkAmount = _amounts.length == 1;
        uint bulkCount = 0;
        
        for (uint i = 0; i < _accounts.length; ++i) {
            uint256 amount = sameBulkAmount ? _amounts[0] : _amounts[i];
            bool success = _awardQuiet(_accounts[i], amount, _ipfsHash, _timeStamp, _isQuiet);
            if (success) {
                bulkCount++;
            } else {
                emit LogBulkAwardedFailure(_accounts[i], amount);
            }
        }

        if (!_isQuiet) {
            emit LogBulkAwardedSummary(bulkCount, msg.sender, _ipfsHash, _timeStamp);
            // No need to emit LogAuditHash(_ipfsHash) as award() already emits the event via _awardQuiet()
        }

        return bulkCount;
    }

    function _awardQuiet(
        address _account, 
        uint256 _amount, 
        string _ipfsHash, 
        uint256 _timeStamp,
        bool _isQuiet
    )
        internal
        onlyAdmins
        contractIsEnabled
        returns (bool) 
    {
        if (_account == address(0)) return false; // No awards for the black hole
        if (_account == address(this)) return false; // No awards for this token
        if (_amount <= 0) return false; // No awards for zero or less amounts
        return _award(_account, _amount, _ipfsHash, _timeStamp, _isQuiet);
    }

    /**
     * @dev A temporary function used to mirgrate old balances. Only valid for brand new contracts.
     * @notice This function *may* be deprecated in the next major release, when logic is separated 
     * from the token contract.
     * @notice _amounts must either be an array of 1 or an array with the same length as accounts
     * @param _oldContract The address of the old contract that is being migrated
     * @param _oldVersion The Khana version of the old contract being migrated
     * @param _accounts The addresses of the users to awarded.
     * @param _amounts The amounts to be awarded to each address.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current awards of tokens.
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function migrateBalancesFromOldContract(
        address _oldContract,
        uint256 _oldVersion,
        address[] _accounts,
        uint256[] _amounts,
        string _ipfsHash,
        uint256 _timeStamp
    )
        public
        onlyOwner
        contractIsEnabled
        returns (bool)
    {
        require(getSupply() == 0, "Tokens already exist");
        _awardBulk(_accounts, _amounts, _ipfsHash, _timeStamp, true);
        emit LogTokenMigration(msg.sender, _oldContract, _oldVersion, _accounts, _amounts, _ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
        return true;
    }

    /**
     * @dev Allow token holders to sell their tokens in return for ETH according
     * to a simple bonding curve.
     * @notice At the moment the calculation for how much ETH is returned is very
     * simplistic. Depending on the portion of the supply they hold, they can
     * liquidate a larger amount of the ETH 'pot', to a maximum of 50% of the pot.
     * E.g. User A holds 25% of the supply and the ETH pot is 100 ETH. Therefore
     * they can sell all their tokens for a maximum amount of 12.5 ETH
     * (0.25 * 0.5 * 100 = 12.5 ETH). See 'whitepaper' for more details around
     * game theory and how this may work as an incentive mechanism. This will
     * likely change in the future to a more complex bonding curve implementation.
     * Example bonding curve calculations here: https://goo.gl/jeJkV5
     * @param _amount The amount to sell.
     */
    function sell(uint256 _amount) public contractIsEnabled fundsContractIsValid returns (bool) {
        uint256 tokenBalanceOfSender = balanceOf(msg.sender);
        require(_amount > 0 && tokenBalanceOfSender >= _amount, "Invalid sell amount");

        uint256 redeemableEth = calculateSellReturn(_amount, tokenBalanceOfSender);
        _burn(msg.sender, _amount);

        BondingCurveFunds(fundsContract).sendEth(redeemableEth, msg.sender);

        emit LogSell(msg.sender, _amount, redeemableEth);

        return true;
    }

    /**
     * @dev Allow token hold to calculate the potential ETH return they will receive
     * from selling a certain amount of tokens.
     * @notice This is also used in the 'sell' function. See above for discussion.
     * @param _sellAmount The amount of tokens to sell.
     * @param _tokenBalance Their entire token balance.
     */
    function calculateSellReturn(
        uint256 _sellAmount,
        uint256 _tokenBalance
    )
        public
        fundsContractIsValid
        view
        returns (uint256)
    {
        require(fundsContract.balance >= minimumEthBalance, "Not enough funds in contract");
        require(_tokenBalance >= _sellAmount, "Invalid sell amount");

        uint256 tokenSupply = getSupply();

        // EVM doesn't deal with floating points well, so multiple and divide by
        // 10e18 to retain accuracy
        uint256 multiplier = 10**18;

        // User can redeem a maximum 50% of the 'pot' if they own 100% of the supply
        uint256 maxRedeemableEth = fundsContract.balance.div(2);

        // Essentially ((tokens i have) / (total supply)) * (ETH in contract * 0.5),
        // using a multiplier due to EVM constraints
        uint256 redeemableEth = (_sellAmount.mul(multiplier).div(tokenSupply).mul(maxRedeemableEth)).div(multiplier);

        return redeemableEth;
    }

    /**
     * @dev Set the 'fundsContract' to a different contract address that is used
     * in the bonding curve.
     * @notice Only the owner can change this value.
     * @param _contract The contract of the new funds contract
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function setFundsContract(address _contract, uint256 _timeStamp) public onlyOwner {
        address oldContract = fundsContract;
        fundsContract = _contract;
        emit LogFundsContractChanged(oldContract, _contract, _timeStamp);
        // emit LogAuditHash(_ipfsHash);
    }

    // TODO: - moveFunds function when changing contracts

    /**
     * @dev An emergency stop that can only be called by the admins.
     * @notice This is an alternative to 'finishMinting()' in MintableToken.sol
     * to enable admins to stop the minting process (not just the owner), and also
     * disables selling the token into the bonding curve contract.
     * Having a valid 'fundsContract' is optional to set the emergency stop.
     * @param _ipfsHash The IPFS hash of the latest audit log, including this action
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     * @return A bool indicating if the emergency stop was successful.
     */
    // override onlyOwner in mintableToken
    function emergencyStop(
        string _ipfsHash, 
        uint256 _timeStamp
    ) 
        public 
        onlyAdmins 
        contractIsEnabled 
        returns (bool) 
    {
        contractEnabled = false;
        if (fundsContract != address(0)) {
            BondingCurveFunds(fundsContract).emergencyStop();
        }
        emit LogContractDisabled(msg.sender, _ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
        return true;
    }

    /**
     * @dev Restore contract functionality, only callable by admins.
     * @notice A valid 'fundsContract' must be set before resuming. This can be
     * done via setFundsContract(address).
     * @param _ipfsHash The IPFS hash of the latest audit log, including this action
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     * @return A bool indicating if the resuming of minting was successful.
     */
    function resumeContract(
        string _ipfsHash, 
        uint256 _timeStamp
    ) 
        public 
        onlyAdmins 
        fundsContractIsValid 
        returns (bool) 
    {
        contractEnabled = true;
        BondingCurveFunds(fundsContract).resumeContract();
        emit LogContractEnabled(msg.sender,_ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
        return true;
    }

    /**
     * @dev Add an admin.
     * @param _account The address of the new admin.
     * @param _ipfsHash The IPFS hash of the latest audit log, including this action
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function addAdmin(address _account, string _ipfsHash, uint256 _timeStamp) public onlyAdmins {
        adminAccounts[_account] = true;
        emit LogAdminAdded(_account, msg.sender, _ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
    }

    /**
     * @dev Bulk adding admins. This can only be used when a contract is brand new.
     * @notice This function *may* be deprecated in the next major release, when logic is separated 
     * from the token contract.
     * @param _oldContract The address of the old contract that is being migrated
     * @param _oldVersion The Khana version of the old contract being migrated
     * @param _accounts The addresses of the previously valid admins.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current awards of tokens.
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function bulkAddAdmin(
        address _oldContract,
        uint256 _oldVersion,
        address[] _accounts,
        string _ipfsHash,
        uint256 _timeStamp
    )
        public
        onlyOwner
        contractIsEnabled
        returns (uint)
    {
        require(getSupply() == 0, "Tokens already exist, only possible with new contract");

        for (uint i = 0; i < _accounts.length; ++i) {
            adminAccounts[_accounts[i]] = true;
        }
        emit LogBulkAdminAdded(msg.sender, _oldContract, _oldVersion, _accounts, _ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
    }

    /**
     * @dev Remove an admin.
     * @notice The original owner (i.e. contract creator) should always have the
     * power to restore things, so cannot be removed as an admin. If the owner
     * role needs to be transfered, then call 'transferOwnership()' in Ownable.sol.
     * @param _account The address of the admin to be removed.
     * @param _ipfsHash The IPFS hash of the latest audit log, including this action
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function removeAdmin(address _account, string _ipfsHash, uint256 _timeStamp) public onlyAdmins {
        require(_account != owner, "Owner account cannot be removed as admin");
        adminAccounts[_account] = false;
        emit LogAdminRemoved(_account, msg.sender, _ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
    }

    /**
     * @dev Check if a user is an admin.
     * @param _account The address of the user to check.
     * @return A bool indicating if the specified account is an admin.
     */
    function checkIfAdmin(address _account) public view returns (bool) {
        return adminAccounts[_account];
    }

    /**
     * @dev Burn tokens from a specific account.
     * @notice This should be used very carefully, as it will affect the audit
     * trail being saved in IPFS and the trust in being awarded the tokens.
     * Still not sure if this function will remain enabled in future versions.
     * For now, only the owner can burn tokens
     * @param _account The address of the account to burn tokens.
     * @param _amount The amount of tokens to burn.
     * @param _ipfsHash The IPFS hash of the latest audit log, including this action
     * @param _timeStamp Used as a unique ID (together with msg.sender) to display
     * details of transactions when auditing
     */
    function burn(
        address _account,
        uint256 _amount,
        string _ipfsHash, 
        uint256 _timeStamp
    ) public onlyOwner {
        _burn(_account, _amount);
        emit LogBurned(_account, msg.sender, _amount, _ipfsHash, _timeStamp);
        emit LogAuditHash(_ipfsHash);
    }

    /**
     * @dev Get the total supply of tokens in circulation.
     * @return A uint256 specifying the total supply of tokens.
     */
    function getSupply() public view returns (uint256) {
        return totalSupply();
    }

    /**
     * @dev The internal burn function, copied from OpenZepplin's burnable token
     */
    function _burn(address _who, uint256 _value) internal {
        require(_value <= balances[_who]);
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        balances[_who] = balances[_who].sub(_value);
        totalSupply_ = totalSupply_.sub(_value);
        emit Transfer(_who, address(0), _value);
    }

    /**
     * @dev Self destruct method
     */
    function destroy() public onlyOwner {
        selfdestruct(owner);
    }

}
