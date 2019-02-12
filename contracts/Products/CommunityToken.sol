pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../Interfaces/IKhanaLogic.sol";

contract CommunityToken is ERC20Mintable, Ownable {
    string public name = "CommunityToken";
    string public symbol = "CMT";
    uint8 public decimals = 18;

    IKhanaLogic public khanaLogic;

    constructor(address _khanaLogicAddress) public {
        khanaLogic = IKhanaLogic(_khanaLogicAddress);
    }

    /**
     * @dev Throws if called by a non-admin account.
     * @notice This modifier overrides the modifier of the same name in
     * MintableToken.sol. We want to keep the safety of Zeppelin's ERC20Mintable,
     * but expand the usecase slightly with more admins with mint permissions.
     */
    modifier hasMintPermission() {
        require(khanaLogic.isAdmin(msg.sender), "Only admins can perform this action");
        _;
    }

    /**
     * @dev Awards tokens to desired address.
     * @notice Only accounts with mint permissions can mint tokens.
     * @param _account The address of the user to award.
     * @param _amount The amount to mint for the address.
     */
    function award(address _account, uint _amount) external hasMintPermission returns (bool) {
        bool success = mint(_account, _amount);
        return success;
    }

    /**
     * @dev Set the address of the KhanaLogic contract.
     * @notice Only the owner can set this.
     * @param _khanaLogic The address of the user to check.
     */
    function setKhanaLogic(address _khanaLogic) public onlyOwner {
        // do checks
        khanaLogic = IKhanaLogic(_khanaLogic);
    }

    /**
     * @dev Checks if the address has mintPermissions.
     * @param _address The address of the user to check.
     */
    function checkMintPermissions(address _address) public view returns (bool) {
        return khanaLogic.isAdmin(_address);
    }
}