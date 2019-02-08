pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../Interfaces/IKhanaLogic.sol";
import "../Interfaces/ICommunityRegister.sol";


contract KhanaLogic is IKhanaLogic, Ownable {
    ICommunityRegister communityRegister;

    modifier onlyAdmins() {
        require(communityRegister.isAdmin(msg.sender), "Only admins can perform this action");
        _;
    }

    constructor(address _communityRegisterAddress) public {
        communityRegister = ICommunityRegister(_communityRegisterAddress);
    }

    function setCommunityRegister(address _communityRegister) public onlyAdmins {
        communityRegister = ICommunityRegister(_communityRegister);
    }

    function isAdmin(address _address) external view returns (bool) {
        return communityRegister.isAdmin(_address);
    }

}