
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZapV2 - Enhanced Zap Contract with Keeper Network Support
 * @notice Supports both centralized (owner) and decentralized (keeper) execution
 */
contract ZapV2 is ERC721URIStorage, Ownable {
    

    
    struct Trigger {
        uint256 triggerType; // 0 = on-chain, 1 = off-chain (Gmail, Price, Webhook)
        address source;
        bytes data; // IPFS hash of trigger config for off-chain triggers
    }

    struct Action {
        uint256 actionType; // 0 = on-chain, 1 = off-chain
        address target;
        uint256 value;
        bytes data;
    }

    struct ZapData {
        address owner;
        Trigger trigger;
        Action[] actions;
        bool active;
        uint256 executionCount;
        uint256 lastExecuted;
    }

    struct KeeperInfo {
        bool registered;
        uint256 stake;
        uint256 executionCount;
        uint256 totalRewardsEarned;
        bool active;
    }

    
    
    uint256 private _nextTokenId;
    mapping(uint256 => ZapData) public zaps;
    
    // Keeper network
    mapping(address => KeeperInfo) public keepers;
    address[] public keeperList;
    uint256 public minKeeperStake = 0.1 ether;
    uint256 public executionReward = 0.001 ether;
    
    
    bool public keeperNetworkEnabled = false;
    
    
    uint256 public rewardPool;

    
    
    event ZapMinted(uint256 indexed zapId, address indexed owner, uint256 triggerType);
    event ZapExecuted(uint256 indexed zapId, address indexed executor, bool isKeeper, uint256 reward);
    event KeeperRegistered(address indexed keeper, uint256 stake);
    event KeeperUnregistered(address indexed keeper, uint256 refund);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event ExecutionRewardUpdated(uint256 newReward);

    
    
    constructor() ERC721("ZapNFT", "ZAP") Ownable(msg.sender) {}

    
    
    /**
     * @notice Mint a new Zap NFT
     * @param _trigger Trigger configuration
     * @param _actions Array of actions to execute
     * @param _metadataURI IPFS URI for zap metadata
     */
    function mintZap(
        Trigger calldata _trigger,
        Action[] calldata _actions,
        string calldata _metadataURI
    ) public returns (uint256) {
        uint256 newTokenId = _nextTokenId;

        ZapData storage newZap = zaps[newTokenId];
        newZap.owner = msg.sender;
        newZap.trigger = _trigger;
        newZap.active = true;
        newZap.executionCount = 0;
        newZap.lastExecuted = 0;
        
        for (uint i = 0; i < _actions.length; i++) {
            newZap.actions.push(_actions[i]);
        }

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _metadataURI);

        _nextTokenId++;
        
        emit ZapMinted(newTokenId, msg.sender, _trigger.triggerType);
        return newTokenId;
    }

    /**
     * @notice Execute a zap (can be called by owner or registered keeper)
     * @param _zapId The ID of the zap to execute
     */
    function execute(uint256 _zapId) external payable {
        require(zaps[_zapId].owner != address(0), "Zap does not exist");
        require(zaps[_zapId].active, "Zap is not active");
        
        ZapData storage zap = zaps[_zapId];
        bool isKeeper = keepers[msg.sender].registered && keepers[msg.sender].active;
        bool isOwner = ownerOf(_zapId) == msg.sender;
        
        // Allow execution by owner OR registered keeper (if keeper network enabled)
        if (keeperNetworkEnabled) {
            require(isKeeper || isOwner, "Not authorized: must be owner or registered keeper");
        } else {
            require(isOwner, "Not authorized: only owner can execute");
        }

        // Execute all actions
        for (uint i = 0; i < zap.actions.length; i++) {
            Action memory currentAction = zap.actions[i];

            if (currentAction.actionType == 0) { // On-chain Action
                (bool success, ) = currentAction.target.call{value: currentAction.value}(currentAction.data);
                require(success, "On-chain action failed");
            }
            // Off-chain actions would be handled by keeper off-chain
            // The keeper submits this tx after detecting the trigger
        }

        // Update execution stats
        zap.executionCount++;
        zap.lastExecuted = block.timestamp;

        // Reward keeper if applicable
        uint256 reward = 0;
        if (isKeeper && keeperNetworkEnabled) {
            reward = _rewardKeeper(msg.sender);
            keepers[msg.sender].executionCount++;
        }

        emit ZapExecuted(_zapId, msg.sender, isKeeper, reward);
    }

    /**
     * @notice Toggle zap active status
     * @param _zapId The ID of the zap
     */
    function toggleZapStatus(uint256 _zapId) external {
        require(ownerOf(_zapId) == msg.sender, "Not the owner");
        zaps[_zapId].active = !zaps[_zapId].active;
    }

    // ============ Keeper Network Functions ============
    
    /**
     * @notice Register as a keeper by staking ETH
     */
    function registerKeeper() external payable {
        require(msg.value >= minKeeperStake, "Insufficient stake");
        require(!keepers[msg.sender].registered, "Already registered");

        keepers[msg.sender] = KeeperInfo({
            registered: true,
            stake: msg.value,
            executionCount: 0,
            totalRewardsEarned: 0,
            active: true
        });

        keeperList.push(msg.sender);
        
        emit KeeperRegistered(msg.sender, msg.value);
    }

    /**
     * @notice Unregister as a keeper and withdraw stake
     */
    function unregisterKeeper() external {
        require(keepers[msg.sender].registered, "Not registered");
        
        uint256 refund = keepers[msg.sender].stake;
        keepers[msg.sender].registered = false;
        keepers[msg.sender].active = false;
        keepers[msg.sender].stake = 0;

        payable(msg.sender).transfer(refund);
        
        emit KeeperUnregistered(msg.sender, refund);
    }

    /**
     * @notice Internal function to reward keeper
     */
    function _rewardKeeper(address keeper) internal returns (uint256) {
        require(rewardPool >= executionReward, "Insufficient reward pool");
        
        rewardPool -= executionReward;
        keepers[keeper].totalRewardsEarned += executionReward;
        
        payable(keeper).transfer(executionReward);
        
        return executionReward;
    }

    /**
     * @notice Fund the reward pool
     */
    function fundRewardPool() external payable {
        rewardPool += msg.value;
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Enable/disable keeper network
     */
    function setKeeperNetworkEnabled(bool _enabled) external onlyOwner {
        keeperNetworkEnabled = _enabled;
    }

    /**
     * @notice Update execution reward amount
     */
    function setExecutionReward(uint256 _reward) external onlyOwner {
        executionReward = _reward;
        emit ExecutionRewardUpdated(_reward);
    }

    /**
     * @notice Update minimum keeper stake
     */
    function setMinKeeperStake(uint256 _stake) external onlyOwner {
        minKeeperStake = _stake;
    }

    // ============ View Functions ============
    
    /**
     * @notice Get total number of zaps
     */
    function getTotalZaps() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Get zap details
     */
    function getZap(uint256 _zapId) external view returns (
        address owner,
        uint256 triggerType,
        bool active,
        uint256 executionCount,
        uint256 actionCount
    ) {
        ZapData storage zap = zaps[_zapId];
        return (
            zap.owner,
            zap.trigger.triggerType,
            zap.active,
            zap.executionCount,
            zap.actions.length
        );
    }

    /**
     * @notice Get keeper count
     */
    function getKeeperCount() external view returns (uint256) {
        return keeperList.length;
    }

    /**
     * @notice Check if address is a registered keeper
     */
    function isKeeper(address _address) external view returns (bool) {
        return keepers[_address].registered && keepers[_address].active;
    }

    // ============ Receive ETH ============
    
    receive() external payable {
        rewardPool += msg.value;
    }
}
