pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Interfaces/IERC20Token.sol";

contract BondedVault is Ownable {

    address public authorisedSender;
    bool public collateralIsEth;
    IERC20Token public collateralToken;
    bool public isFrozen;

    event LogCollateralSend(
        uint amount,
        address indexed account
    );

    event LogCollateralTypeChanged(
        bool isEth,
        address indexed account
    );

    event LogEthDonated(
        uint amount,
        address indexed account
    );

    event LogAuthorisedSenderChanged(
        address indexed newSender,
        address oldSender,
        address owner
    );

    event LogVaultFrozen(
        address indexed owner,
        bool isFrozen
    );

    modifier onlyAuthorisedSender() {
        require(msg.sender == authorisedSender, "Non-authorised sender");
        _;
    }

    modifier onlyUnfrozen() {
        require(!isFrozen, "Vault is currently frozen");
        _;
    }

    /**
     * @dev Send the underlying collateral to a specific address
     * @notice This function will send ETH or another ERC20 depending on the value of collateralIsEth.
     * @param _amount The amount of collateral to be transfered.
     * @param _account The address of the user to awarded.
     */
    function sendCollateral(uint _amount, address payable _account) public onlyAuthorisedSender onlyUnfrozen {
        if (collateralIsEth) {
            _account.transfer(_amount);
        } else {
            collateralToken.transfer(_account, _amount);
        }
        emit LogCollateralSend(_amount, _account);
    }

    /**
     * @dev Set the underlying asset type for collateral
     * @notice By default this is set to non ETH (i.e. ERC20).
     * @param _collateralIsEth A bool value to determine if ETH is the collateral underlying the curve
     */
    function setCollateralToEth(bool _collateralIsEth) public onlyOwner {
        collateralIsEth = _collateralIsEth;
        emit LogCollateralTypeChanged(_collateralIsEth, msg.sender);
    }

    /**
     * @dev Fallback function to accept direct ETH transfers as free donations to the bonding curve.
     * @notice Does not accept funds when vault is frozen.
     */
    function () external onlyUnfrozen payable  {
        emit LogEthDonated(msg.value, msg.sender);
    }

    /**
     * @dev Set the authorisedSender address.
     * @notice The authorisedSender is able to send collateral to an address. Ideally the authorisedSender
     * should be another contract such as the CommunityRegister.
     * @param _authorisedSender The address of the new authorisedSender.
     */
    function setAuthorisedSender(address _authorisedSender) public onlyOwner {
        address oldSender = authorisedSender;
        authorisedSender = _authorisedSender;
        emit LogAuthorisedSenderChanged(_authorisedSender, oldSender, msg.sender);
    }

    /**
     * @dev Sets or unsets the vault in a frozen state, where no transfers are possible.
     * @param _isFrozen Whether the vault should be frozen or not.
     */
    function setFreeze(bool _isFrozen) public onlyOwner {
        isFrozen = _isFrozen;
        emit LogVaultFrozen(msg.sender, isFrozen);
    }
}