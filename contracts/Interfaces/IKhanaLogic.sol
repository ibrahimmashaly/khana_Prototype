pragma solidity ^0.5.0;

interface IKhanaLogic {
    function isAdmin(address _address) external view returns (bool);
}