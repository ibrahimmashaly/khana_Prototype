pragma solidity ^0.4.24;

import "../KhanaToken.sol";

/**
 * @title Proof of Concept contract for the Khana framework, for Shiatsu Amsterdam community
 * @author David Truong <david@truong.vc>
 * @dev This is one of the first prototype deployments of Khana for the Shiatsu Amsterdam community
 */

contract ShiatsuToken is KhanaToken {
    string public name = "Value Of Shiatsu Token";
    string public symbol = "VOS";
    uint8 public decimals = 18;
}
