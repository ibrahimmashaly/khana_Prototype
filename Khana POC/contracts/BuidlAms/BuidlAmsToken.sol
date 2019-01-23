pragma solidity ^0.4.24;

import "../KhanaToken.sol";

/**
 * @title Proof of Concept contract for the Khana framework, for #BUIDL AMS community
 * @author David Truong <david@truong.vc>
 * @dev This is one of the first prototype deployments of Khana for the #BUIDL AMS community
 * For more information, see: http://buidl.events
 */

contract BuidlAmsToken is KhanaToken {
    string public name = "#BUIDL AMS Token";
    string public symbol = "BDLAMS";
    uint8 public decimals = 18;
}
