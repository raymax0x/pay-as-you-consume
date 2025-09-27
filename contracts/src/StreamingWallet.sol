// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IERC4626
 * @dev Minimal interface for an ERC4626 Vault.
 * We only need the `withdraw` function for this contract, but also include
 * others for context and potential future use. The `withdraw` function
 * allows this contract (the "owner" of the approval) to pull funds from
 * a user's vault balance on their behalf.
 */
interface IERC4626 {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function decimals() external view returns (uint8);
}

/**
 * @title IYieldVault
 * @dev An extended interface assuming your Vault has functions to query
 * principal and yield separately. This is crucial for the "deduct from yield first" logic.
 */
interface IYieldVault is IERC4626 {
    function principalOf(address user) external view returns (uint256);
    function yieldOf(address user) external view returns (uint256);
}

/**
 * @title StreamingWallet
 * @author Your Name
 * @notice A smart contract that enables pay-per-use micropayments for content,
 * funded by a user's position in a yield-bearing DeFi vault (ERC4626).
 * @dev This contract tracks content consumption time and calculates the cost,
 * deducting it from the user's yield first, before touching the principal.
 * IMPORTANT: Users MUST approve this contract to spend their vault's underlying asset.
 */
contract StreamingWallet is Ownable {
    //================================================================
    // State Variables
    //================================================================

    IYieldVault public immutable vault;

    struct Session {
        bool isActive;
        uint64 startTime;          // Timestamp when the current streaming period began.
        uint64 accumulatedTime;    // Total time in seconds the stream has been active (tracks across pauses).
        uint64 lastUpdateTime;     // Timestamp of the last action (start, pause, resume).
    }

    struct ContentInfo {
        uint128 fullPrice;         // Price for consuming 100% of the content.
        uint64 totalDuration;      // Total duration of the content in seconds.
        bool isListed;
    }

    // Mapping: user => contentId => Session
    mapping(address => mapping(bytes32 => Session)) public userSessions;

    // Mapping: contentId => ContentInfo
    mapping(bytes32 => ContentInfo) public contentInfo;

    //================================================================
    // Events
    //================================================================

    event ContentListed(bytes32 indexed contentId, uint256 fullPrice, uint256 totalDuration);
    event PaymentStreamStarted(address indexed user, bytes32 indexed contentId, uint256 startTime);
    event PaymentStreamPaused(address indexed user, bytes32 indexed contentId, uint256 pauseTime, uint256 consumedDuration);
    event PaymentStreamStopped(address indexed user, bytes32 indexed contentId, uint256 stopTime, uint256 totalConsumedDuration, uint256 amountDeducted);
    event PaymentDeducted(address indexed user, bytes32 indexed contentId, uint256 amount, bool fromYield, uint256 remainingYield);

    //================================================================
    // Constructor
    //================================================================

    constructor(address _vaultAddress) Ownable(msg.sender) {
        require(_vaultAddress != address(0), "StreamingWallet: Vault address cannot be zero");
        vault = IYieldVault(_vaultAddress);
    }

    //================================================================
    // Owner Functions
    //================================================================

    /**
     * @notice Lists a new piece of content or updates an existing one.
     * @param _contentId A unique identifier for the content (e.g., keccak256("video-intro-to-crypto")).
     * @param _fullPrice The price for consuming 100% of the content, in the vault's asset decimals.
     * @param _totalDuration The total duration of the content in seconds.
     */
    function listContent(bytes32 _contentId, uint128 _fullPrice, uint64 _totalDuration) external onlyOwner {
        require(_fullPrice > 0, "StreamingWallet: Price must be greater than zero");
        require(_totalDuration > 0, "StreamingWallet: Duration must be greater than zero");

        contentInfo[_contentId] = ContentInfo({
            fullPrice: _fullPrice,
            totalDuration: _totalDuration,
            isListed: true
        });

        emit ContentListed(_contentId, _fullPrice, _totalDuration);
    }

    //================================================================
    // Public User Functions
    //================================================================

    /**
     * @notice Starts or resumes a payment stream for a piece of content.
     * @param _contentId The identifier of the content to stream.
     */
    function startStream(bytes32 _contentId) external {
        Session storage session = userSessions[msg.sender][_contentId];
        require(contentInfo[_contentId].isListed, "StreamingWallet: Content not listed");
        require(!session.isActive, "StreamingWallet: Stream is already active");

        uint64 currentTime = uint64(block.timestamp);
        session.isActive = true;
        // If it's a resume, startTime is updated. If it's a fresh start, startTime is set.
        session.startTime = currentTime;
        session.lastUpdateTime = currentTime;

        emit PaymentStreamStarted(msg.sender, _contentId, currentTime);
    }

    /**
     * @notice Pauses an active payment stream.
     * @param _contentId The identifier of the content stream to pause.
     */
    function pauseStream(bytes32 _contentId) external {
        Session storage session = userSessions[msg.sender][_contentId];
        require(session.isActive, "StreamingWallet: Stream is not active");

        uint64 currentTime = uint64(block.timestamp);
        uint64 elapsedTime = currentTime - session.lastUpdateTime;

        session.isActive = false;
        session.accumulatedTime += elapsedTime;
        session.lastUpdateTime = currentTime;

        emit PaymentStreamPaused(msg.sender, _contentId, currentTime, session.accumulatedTime);
    }

    /**
     * @notice Stops a stream and triggers the final payment deduction.
     * @param _contentId The identifier of the content stream to stop.
     */
    function stopStream(bytes32 _contentId) external {
        Session storage session = userSessions[msg.sender][_contentId];
        ContentInfo memory content = contentInfo[_contentId];
        require(content.isListed, "StreamingWallet: Content not listed");
        // A user might stop a stream that was never started or is already paused.
        require(session.lastUpdateTime > 0, "StreamingWallet: Stream was never started");


        uint64 totalConsumedTime = session.accumulatedTime;
        if (session.isActive) {
            totalConsumedTime += (uint64(block.timestamp) - session.lastUpdateTime);
        }

        if (totalConsumedTime == 0) {
            // No consumption, no charge. Clean up state.
            delete userSessions[msg.sender][_contentId];
            emit PaymentStreamStopped(msg.sender, _contentId, block.timestamp, 0, 0);
            return;
        }

        uint256 paymentAmount = _calculatePayment(totalConsumedTime, content.fullPrice, content.totalDuration);

        if (paymentAmount > 0) {
            _deductPayment(msg.sender, _contentId, paymentAmount);
        }

        // Clean up the session state to save gas for future transactions
        delete userSessions[msg.sender][_contentId];

        emit PaymentStreamStopped(msg.sender, _contentId, block.timestamp, totalConsumedTime, paymentAmount);
    }


    //================================================================
    // Internal & Helper Functions
    //================================================================

    /**
     * @dev Calculates the payment amount based on time consumed.
     * @return The amount to be paid in the vault's asset.
     */
    function _calculatePayment(uint256 consumedDuration, uint256 fullPrice, uint256 totalDuration) internal pure returns (uint256) {
        // Using integer math: (price * consumed) / total
        // This calculates the pro-rata cost.
        return (fullPrice * consumedDuration) / totalDuration;
    }

    /**
     * @dev Handles the logic of deducting payment, prioritizing yield.
     */
    function _deductPayment(address user, bytes32 contentId, uint256 amount) internal {
        uint256 userYield = vault.yieldOf(user);

        if (amount <= userYield) {
            // Cost is fully covered by yield
            vault.withdraw(amount, user, user);
            emit PaymentDeducted(user, contentId, amount, true, userYield - amount);
        } else {
            // Cost exceeds yield, use all yield then dip into principal
            uint256 remainingAmount = amount - userYield;

            // First, withdraw all the yield
            if (userYield > 0) {
                vault.withdraw(userYield, user, user);
                emit PaymentDeducted(user, contentId, userYield, true, 0);
            }

            // Then, withdraw the rest from the principal
            vault.withdraw(remainingAmount, user, user);
            emit PaymentDeducted(user, contentId, remainingAmount, false, 0);
        }
    }

    /**
     * @notice A view function to check the current cost of an ongoing stream without stopping it.
     * @param _user The address of the user.
     * @param _contentId The identifier of the content.
     * @return The current cost accrued for the session.
     */
    function getCurrentCost(address _user, bytes32 _contentId) external view returns (uint256) {
        Session memory session = userSessions[_user][_contentId];
        ContentInfo memory content = contentInfo[_contentId];

        if (!content.isListed || session.lastUpdateTime == 0) {
            return 0;
        }

        uint64 totalConsumedTime = session.accumulatedTime;
        if (session.isActive) {
            totalConsumedTime += (uint64(block.timestamp) - session.lastUpdateTime);
        }

        return _calculatePayment(totalConsumedTime, content.fullPrice, content.totalDuration);
    }
}
