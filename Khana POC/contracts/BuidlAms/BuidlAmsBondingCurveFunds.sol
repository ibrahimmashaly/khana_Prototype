pragma solidity ^0.4.24;

import "../BondingCurveFunds.sol";

/**
 * @title Proof of Concept contract for the Funds contract for #BUIDL AMS community
 * @author David Truong <david@truong.vc>
 * @dev This contract is meant to ONLY hold and send ETH funds (or maybe an
 * alternative token in the future). This is to isolate funds from logic and
 * increase safety and upgradability.
 * For more information, see: http://buidl.events
 */

contract BuidlAmsBondingCurveFunds is BondingCurveFunds {
    constructor(address _tokenAddress) BondingCurveFunds(_tokenAddress) public {
    }
}
