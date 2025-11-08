// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Zap.sol";

contract Listener {
    Zap public zapContract;

    constructor(address _zapContractAddress) {
        zapContract = Zap(_zapContractAddress);
    }

    function executeZap(uint256 _zapId) external {
        zapContract.execute(_zapId);
    }
}
