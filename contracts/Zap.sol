// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

interface IZapOracle {
    function sendEmail(string[] memory args) external returns (bytes32 requestId);
}

contract Zap is ERC721URIStorage {
    struct Trigger {
        uint256 triggerType; // 0 for on-chain, 1 for off-chain
        address source;
        bytes data;
    }

    struct Action {
        uint256 actionType; // 0 for on-chain, 1 for off-chain
        address target;
        uint256 value;
        bytes data;
    }

    struct ZapData {
        address owner;
        Trigger trigger;
        Action[] actions;
    }

    uint256 private _nextTokenId;

    mapping(uint256 => ZapData) public zaps;
    IZapOracle public zapOracle;

    constructor(address _zapOracleAddress) ERC721("ZapNFT", "ZAP") {
        zapOracle = IZapOracle(_zapOracleAddress);
    }

    function mintZap(Trigger calldata _trigger, Action[] calldata _actions) public returns (uint256) {
        uint256 newTokenId = _nextTokenId;

        ZapData storage newZap = zaps[newTokenId];
        newZap.owner = msg.sender;
        newZap.trigger = _trigger;
        for (uint i = 0; i < _actions.length; i++) {
            newZap.actions.push(_actions[i]);
        }

        _safeMint(msg.sender, newTokenId);
        // _setTokenURI(newTokenId, "YOUR_METADATA_URI_HERE"); // We will set this later

        _nextTokenId++;
        return newTokenId;
    }

    function execute(uint256 _zapId) external payable {
        require(zaps[_zapId].owner != address(0), "Zap does not exist");
        // For now, only the owner of the Zap can execute it.
        // A keeper network will be implemented later.
        require(ownerOf(_zapId) == msg.sender, "Only the Zap owner can execute");

        ZapData storage zap = zaps[_zapId];

        for (uint i = 0; i < zap.actions.length; i++) {
            Action memory currentAction = zap.actions[i];

            if (currentAction.actionType == 0) { // On-chain Action
                (bool success, ) = currentAction.target.call{value: currentAction.value}(currentAction.data);
                require(success, "On-chain action failed");
            } else { // Off-chain Action
                // For off-chain actions, we assume the `data` field is a CBOR-encoded array of strings.
                string[] memory args = abi.decode(currentAction.data, (string[]));
                zapOracle.sendEmail(args);
            }
        }
    }
}
