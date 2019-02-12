pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../Interfaces/IKhanaLogic.sol";
import "../Interfaces/IBondedVault.sol";

/**
* @author David Truong | Khana.io
* @title Collateral Token contract
* @notice This contract will be used as a temporary measure to bridge between testnet
* and mainnet. Real collateral will be held in a multisig vault on mainnet, with the 
* testnet collateral keeping a 1 to 1 peg with the multisig vault. 
* As collateral is added to the bonding curve, the same must be applied to both the 
* testnet and mainnet collateral pools. This ensures that the 'price' calculated per
* token is accurate, real, and transferable. 
* In the case of a catastrophic failure, this collateral token contract can be 'reset',
* with the mainnet collateral being safe under the multisig holders. 
*/
contract CollateralToken is ERC20, Ownable {

    IKhanaLogic public khanaLogic;
    IBondedVault public bondedVault;

    modifier onlyAdmins() {
        require(khanaLogic.isAdmin(msg.sender), "Only admins can perform this action");
        _;
    }

    constructor(address _khanaLogicAddress, address _bondedVaultAddress) public {
        khanaLogic = IKhanaLogic(_khanaLogicAddress);
        bondedVault = IBondedVault(_bondedVaultAddress);
    }

    /**
     * @dev Change the default khanaLogic address
     * @param _khanaLogic The address of the khanaLogic contract, that conforms 
     * to the IKhanaLogic interface
     */
    function setKhanaLogic(address _khanaLogic) public onlyAdmins {
        khanaLogic = IKhanaLogic(_khanaLogic);
    }

    /**
     * @dev Change the default bondedVault address
     * @param _bondedVaultAddress The address of the bondedVault contract, that conforms 
     * to the IBondedvault interface
     */
    function setBondedVault(address _bondedVaultAddress) public onlyAdmins {
        bondedVault = IBondedVault(_bondedVaultAddress);
    }

    /**
     * @dev Mint the ERC20 collateral for the BondedVault contract.
     * @notice The collateral can only be minted into the BondedVault contract.
     * @param _value The amount of collateral to be minted
     */
    function mintCollateral(uint _value) external onlyAdmins returns (bool) {
        _mint(address(bondedVault), _value);
        return true;
    }

    /**
     * @dev Burn the ERC20 collateral from the BondedVault contract.
     * @notice The collateral can only be burned from the BondedVault contract.
     * @param _value The amount of collateral to be burned
     */
    function burnCollateral(uint _value) external onlyAdmins returns (bool) {
        _burn(address(bondedVault), _value);
        return true;
    }
}