// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title StreamingWalletV2
 * @author ETHGlobal Team
 * @notice A streaming wallet that implements precise session lifecycle as per product brief
 * @dev Implements sessionId-based lifecycle with single settlement on STOP
 */
contract StreamingWalletV2 is Ownable, ReentrancyGuard {
    using Math for uint256;

    //================================================================
    // State Variables
    //================================================================

    /// @notice The yield vault where users deposit USDT
    IERC4626 public immutable vault;

    /// @notice Session status enum
    enum SessionStatus { IDLE, PLAYING, PAUSED, STOPPED }

    /// @notice Session struct with precise tracking
    struct Session {
        address user;           // Session owner
        bytes32 contentId;      // Content being consumed
        uint256 pricePerSecond; // Price per second in vault asset units
        uint256 consumedSec;    // Total consumed seconds
        SessionStatus status;   // Current session status
        uint256 startTime;      // When session started (for current play period)
        uint256 pausedAt;       // When session was paused (0 if not paused)
    }

    /// @notice Auto-incrementing session counter
    uint256 private _sessionCounter;

    /// @notice All sessions by sessionId
    mapping(uint256 => Session) public sessions;

    /// @notice User's active sessions (user => sessionId[])
    mapping(address => uint256[]) public userActiveSessions;

    //================================================================
    // Events
    //================================================================

    event SessionStarted(
        uint256 indexed sessionId,
        address indexed user,
        bytes32 indexed contentId,
        uint256 pricePerSecond
    );

    event SessionPaused(
        uint256 indexed sessionId,
        address indexed user,
        uint256 consumedSecAtPause
    );

    event SessionResumed(
        uint256 indexed sessionId,
        address indexed user
    );

    event SessionFinalized(
        uint256 indexed sessionId,
        address indexed user,
        bytes32 indexed contentId,
        uint256 consumedSec,
        uint256 amountPaid
    );

    //================================================================
    // Constructor
    //================================================================

    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "StreamingWallet: Vault cannot be zero address");
        vault = IERC4626(_vault);
    }

    //================================================================
    // Public Functions
    //================================================================

    /**
     * @notice Start a new streaming session
     * @param contentId The content identifier
     * @param pricePerSecond Price per second in vault asset units
     * @return sessionId The new session ID
     */
    function startSession(bytes32 contentId, uint256 pricePerSecond)
        external
        nonReentrant
        returns (uint256 sessionId)
    {
        require(contentId != bytes32(0), "StreamingWallet: Invalid content ID");
        require(pricePerSecond > 0, "StreamingWallet: Price must be > 0");

        // Increment session counter
        sessionId = ++_sessionCounter;

        // Create new session
        sessions[sessionId] = Session({
            user: msg.sender,
            contentId: contentId,
            pricePerSecond: pricePerSecond,
            consumedSec: 0,
            status: SessionStatus.PLAYING,
            startTime: block.timestamp,
            pausedAt: 0
        });

        // Add to user's active sessions
        userActiveSessions[msg.sender].push(sessionId);

        emit SessionStarted(sessionId, msg.sender, contentId, pricePerSecond);
    }

    /**
     * @notice Pause an active session
     * @param sessionId The session to pause
     */
    function pauseSession(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];

        require(session.user == msg.sender, "StreamingWallet: Not session owner");
        require(session.status == SessionStatus.PLAYING, "StreamingWallet: Session not playing");

        // Calculate consumed time since last start/resume
        uint256 elapsedSec = block.timestamp - session.startTime;
        session.consumedSec += elapsedSec;

        // Update session state
        session.status = SessionStatus.PAUSED;
        session.pausedAt = block.timestamp;
        session.startTime = 0; // Clear start time

        emit SessionPaused(sessionId, msg.sender, session.consumedSec);
    }

    /**
     * @notice Resume a paused session
     * @param sessionId The session to resume
     */
    function resumeSession(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];

        require(session.user == msg.sender, "StreamingWallet: Not session owner");
        require(session.status == SessionStatus.PAUSED, "StreamingWallet: Session not paused");

        // Update session state
        session.status = SessionStatus.PLAYING;
        session.startTime = block.timestamp;
        session.pausedAt = 0;

        emit SessionResumed(sessionId, msg.sender);
    }

    /**
     * @notice Stop a session and settle payment
     * @param sessionId The session to stop
     * @param consumedSec Total consumed seconds (client-reported)
     */
    function stopSession(uint256 sessionId, uint256 consumedSec) external nonReentrant {
        Session storage session = sessions[sessionId];

        require(session.user == msg.sender, "StreamingWallet: Not session owner");
        require(session.status == SessionStatus.PLAYING || session.status == SessionStatus.PAUSED,
                "StreamingWallet: Session not active");

        // Calculate final consumed time
        uint256 finalConsumedSec = consumedSec;

        // If session is playing, add elapsed time since start
        if (session.status == SessionStatus.PLAYING) {
            uint256 elapsedSec = block.timestamp - session.startTime;
            finalConsumedSec = session.consumedSec + elapsedSec;
        } else {
            // If paused, use the already accumulated time
            finalConsumedSec = session.consumedSec;
        }

        // Use client-reported time if provided and reasonable
        if (consumedSec > 0 && consumedSec >= session.consumedSec) {
            finalConsumedSec = consumedSec;
        }

        // Calculate payment amount (round up to avoid dust)
        uint256 amountToPay = (finalConsumedSec * session.pricePerSecond + 999) / 1000 * 1000; // Round up

        // Update session state
        session.consumedSec = finalConsumedSec;
        session.status = SessionStatus.STOPPED;
        session.startTime = 0;
        session.pausedAt = 0;

        // Process payment if amount > 0
        if (amountToPay > 0) {
            _processPayment(msg.sender, amountToPay);
        }

        // Remove from active sessions
        _removeFromActiveSessions(msg.sender, sessionId);

        emit SessionFinalized(sessionId, msg.sender, session.contentId, finalConsumedSec, amountToPay);
    }

    //================================================================
    // View Functions
    //================================================================

    /**
     * @notice Get session details
     * @param sessionId The session ID
     * @return session The session struct
     */
    function getSession(uint256 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }

    /**
     * @notice Get current consumed time for an active session
     * @param sessionId The session ID
     * @return consumedSec Current consumed seconds
     */
    function getCurrentConsumedTime(uint256 sessionId) external view returns (uint256 consumedSec) {
        Session memory session = sessions[sessionId];

        if (session.status == SessionStatus.PLAYING) {
            uint256 elapsedSec = block.timestamp - session.startTime;
            return session.consumedSec + elapsedSec;
        }

        return session.consumedSec;
    }

    /**
     * @notice Get current amount owed for a session
     * @param sessionId The session ID
     * @return amountOwed Current amount owed
     */
    function getCurrentAmountOwed(uint256 sessionId) external view returns (uint256 amountOwed) {
        uint256 consumedSec = this.getCurrentConsumedTime(sessionId);
        Session memory session = sessions[sessionId];
        return (consumedSec * session.pricePerSecond + 999) / 1000 * 1000; // Round up
    }

    /**
     * @notice Get user's active session IDs
     * @param user The user address
     * @return sessionIds Array of active session IDs
     */
    function getUserActiveSessions(address user) external view returns (uint256[] memory) {
        return userActiveSessions[user];
    }

    //================================================================
    // Internal Functions
    //================================================================

    /**
     * @notice Process payment by withdrawing from user's vault balance
     * @param user The user to charge
     * @param amount The amount to charge
     */
    function _processPayment(address user, uint256 amount) internal {
        // Withdraw from user's vault shares
        // Note: User must have approved this contract or have sufficient vault balance
        try vault.withdraw(amount, address(this), user) {
            // Payment successful - funds are now in this contract
            // In a real implementation, these might be forwarded to content providers
        } catch {
            revert("StreamingWallet: Payment failed - insufficient vault balance");
        }
    }

    /**
     * @notice Remove session from user's active sessions array
     * @param user The user address
     * @param sessionId The session ID to remove
     */
    function _removeFromActiveSessions(address user, uint256 sessionId) internal {
        uint256[] storage activeSessions = userActiveSessions[user];

        for (uint256 i = 0; i < activeSessions.length; i++) {
            if (activeSessions[i] == sessionId) {
                // Move last element to current position and pop
                activeSessions[i] = activeSessions[activeSessions.length - 1];
                activeSessions.pop();
                break;
            }
        }
    }
}