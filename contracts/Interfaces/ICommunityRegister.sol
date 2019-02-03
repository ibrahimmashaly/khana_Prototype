pragma solidity ^0.5.0;

interface ICommunityRegister {
    function isAdmin(address _address) external view returns (bool);
}