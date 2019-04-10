pragma solidity ^0.4.24;

import "../KhanaToken.sol";

/**
 * @title Proof of Concept contract for the Khana framework, for BlockchainTalks community
 * @author David Truong <david@truong.vc>
 * @dev This is one of the first prototype deployments of Khana for the BlockchainTalks community
 * For more information, see: https://blockchaintalks.io/
 */

contract BlockchainTalksToken is KhanaToken {
    string public name = "BlockchainTalks";
    string public symbol = "BCT";
    uint8 public decimals = 18;
}
