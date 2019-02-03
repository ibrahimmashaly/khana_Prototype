pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Interfaces/ICommunityRegister.sol";

contract CommunityRegister is ICommunityRegister, Ownable {

    mapping (address => bool) public adminAccounts;

    /**
     * @dev The owner is added as an admin.
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
     * @dev Check if a user is an admin.
     * @param _address The address of the user to check.
     * @return A bool indicating if the specified account is an admin.
     */
    function isAdmin(address _address) external view returns (bool) {
        return adminAccounts[_address];
    }

    /**
     * @dev Add an admin.
     * @param _account The address of the new admin.
     */
    function addAdmin(address _account) public onlyAdmins {
        adminAccounts[_account] = true;
    }

    /**
     * @dev Remove an admin.
     * @notice The original owner (i.e. contract creator) should always have the
     * power to restore things, so cannot be removed as an admin. If the owner
     * role needs to be transfered, then call 'transferOwnership()' in Ownable.sol.
     * @param _account The address of the admin to be removed.
     */
    function removeAdmin(address _account) public onlyAdmins {
        require(address(_account) != owner(), "Owner account cannot be removed as admin");
        adminAccounts[_account] = false;
    }
}