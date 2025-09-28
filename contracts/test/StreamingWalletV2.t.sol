// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/StreamingWalletV2.sol";
import "../src/YieldVault.sol";
import "../src/MockUSDT.sol";

contract StreamingWalletV2Test is Test {
    StreamingWalletV2 public streamingWallet;
    YieldVault public vault;
    MockUSDT public usdt;

    address public owner = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);

    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 1e6;
    uint256 public constant APY_BASIS_POINTS = 500; // 5%

    bytes32 public constant CONTENT_ID = keccak256("video-intro-to-defi");
    uint256 public constant PRICE_PER_SECOND = 1000; // 0.001 USDT per second

    function setUp() public {
        vm.startPrank(owner);

        // Deploy contracts
        usdt = new MockUSDT();
        vault = new YieldVault(
            IERC20(address(usdt)),
            "Yield USDT",
            "yUSDT",
            APY_BASIS_POINTS
        );
        streamingWallet = new StreamingWalletV2(address(vault));

        // Mint USDT and deposit to vault
        usdt.mint(alice, INITIAL_SUPPLY);
        usdt.mint(bob, INITIAL_SUPPLY);

        vm.stopPrank();

        // Alice and Bob deposit to vault
        vm.startPrank(alice);
        usdt.approve(address(vault), 10000 * 1e6);
        vault.deposit(10000 * 1e6, alice);
        vm.stopPrank();

        vm.startPrank(bob);
        usdt.approve(address(vault), 5000 * 1e6);
        vault.deposit(5000 * 1e6, bob);
        vm.stopPrank();

        // Give StreamingWallet approval to spend from vault
        vm.startPrank(alice);
        vault.approve(address(streamingWallet), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        vault.approve(address(streamingWallet), type(uint256).max);
        vm.stopPrank();
    }

    function testStartSession() public {
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);
        vm.stopPrank();

        // Check session was created
        StreamingWalletV2.Session memory session = streamingWallet.getSession(sessionId);
        assertEq(session.user, alice);
        assertEq(session.contentId, CONTENT_ID);
        assertEq(session.pricePerSecond, PRICE_PER_SECOND);
        assertEq(uint256(session.status), uint256(StreamingWalletV2.SessionStatus.PLAYING));
        assertEq(session.consumedSec, 0);

        // Check user's active sessions
        uint256[] memory activeSessions = streamingWallet.getUserActiveSessions(alice);
        assertEq(activeSessions.length, 1);
        assertEq(activeSessions[0], sessionId);
    }

    function testPauseSession() public {
        // Start session
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        // Wait 60 seconds and pause
        vm.warp(block.timestamp + 60);
        streamingWallet.pauseSession(sessionId);
        vm.stopPrank();

        // Check session state
        StreamingWalletV2.Session memory session = streamingWallet.getSession(sessionId);
        assertEq(uint256(session.status), uint256(StreamingWalletV2.SessionStatus.PAUSED));
        assertEq(session.consumedSec, 60);
        assertGt(session.pausedAt, 0);
    }

    function testResumeSession() public {
        // Start, pause, then resume
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        vm.warp(block.timestamp + 60);
        streamingWallet.pauseSession(sessionId);

        vm.warp(block.timestamp + 30); // 30 seconds pause
        streamingWallet.resumeSession(sessionId);
        vm.stopPrank();

        // Check session state
        StreamingWalletV2.Session memory session = streamingWallet.getSession(sessionId);
        assertEq(uint256(session.status), uint256(StreamingWalletV2.SessionStatus.PLAYING));
        assertEq(session.consumedSec, 60); // Should still be 60
        assertEq(session.pausedAt, 0);
        assertEq(session.startTime, block.timestamp);
    }

    function testStopSessionWithPayment() public {
        // Start session
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        // Wait 120 seconds and stop
        vm.warp(block.timestamp + 120);

        uint256 aliceBalanceBefore = usdt.balanceOf(alice);
        streamingWallet.stopSession(sessionId, 120);
        vm.stopPrank();

        // Check session state
        StreamingWalletV2.Session memory session = streamingWallet.getSession(sessionId);
        assertEq(uint256(session.status), uint256(StreamingWalletV2.SessionStatus.STOPPED));
        assertEq(session.consumedSec, 120);

        // Check payment was processed
        uint256 expectedPayment = 120 * PRICE_PER_SECOND;
        // Note: Payment goes to StreamingWallet contract, not back to user
        assertEq(usdt.balanceOf(address(streamingWallet)), expectedPayment);

        // Check user no longer has active sessions
        uint256[] memory activeSessions = streamingWallet.getUserActiveSessions(alice);
        assertEq(activeSessions.length, 0);
    }

    function testStopPausedSession() public {
        // Start and pause session
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        vm.warp(block.timestamp + 60);
        streamingWallet.pauseSession(sessionId);

        vm.warp(block.timestamp + 30); // Wait while paused
        streamingWallet.stopSession(sessionId, 0); // Let contract calculate
        vm.stopPrank();

        // Check session state
        StreamingWalletV2.Session memory session = streamingWallet.getSession(sessionId);
        assertEq(uint256(session.status), uint256(StreamingWalletV2.SessionStatus.STOPPED));
        assertEq(session.consumedSec, 60); // Should be 60, not 90

        // Check payment
        uint256 expectedPayment = 60 * PRICE_PER_SECOND;
        assertEq(usdt.balanceOf(address(streamingWallet)), expectedPayment);
    }

    function testMultipleSessions() public {
        bytes32 contentId2 = keccak256("video-advanced-defi");

        // Alice starts two sessions
        vm.startPrank(alice);
        uint256 sessionId1 = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);
        uint256 sessionId2 = streamingWallet.startSession(contentId2, PRICE_PER_SECOND * 2);
        vm.stopPrank();

        // Bob starts one session
        vm.startPrank(bob);
        uint256 sessionId3 = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);
        vm.stopPrank();

        // Check active sessions
        uint256[] memory aliceActiveSessions = streamingWallet.getUserActiveSessions(alice);
        uint256[] memory bobActiveSessions = streamingWallet.getUserActiveSessions(bob);

        assertEq(aliceActiveSessions.length, 2);
        assertEq(bobActiveSessions.length, 1);
    }

    function testGetCurrentConsumedTime() public {
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        // Check initial consumed time
        assertEq(streamingWallet.getCurrentConsumedTime(sessionId), 0);

        // Wait 45 seconds
        vm.warp(block.timestamp + 45);
        assertEq(streamingWallet.getCurrentConsumedTime(sessionId), 45);

        // Pause and wait
        streamingWallet.pauseSession(sessionId);
        vm.warp(block.timestamp + 30);
        assertEq(streamingWallet.getCurrentConsumedTime(sessionId), 45); // Should not increase

        // Resume and wait
        streamingWallet.resumeSession(sessionId);
        vm.warp(block.timestamp + 15);
        assertEq(streamingWallet.getCurrentConsumedTime(sessionId), 60); // 45 + 15
        vm.stopPrank();
    }

    function testGetCurrentAmountOwed() public {
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        vm.warp(block.timestamp + 100);
        uint256 amountOwed = streamingWallet.getCurrentAmountOwed(sessionId);
        uint256 expectedAmount = 100 * PRICE_PER_SECOND;

        // Should round up
        assertGe(amountOwed, expectedAmount);
        vm.stopPrank();
    }

    function testUnauthorizedActions() public {
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);
        vm.stopPrank();

        // Bob tries to pause Alice's session
        vm.startPrank(bob);
        vm.expectRevert("StreamingWallet: Not session owner");
        streamingWallet.pauseSession(sessionId);

        vm.expectRevert("StreamingWallet: Not session owner");
        streamingWallet.stopSession(sessionId, 0);
        vm.stopPrank();
    }

    function testInvalidSessionOperations() public {
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, PRICE_PER_SECOND);

        // Try to resume without pausing
        vm.expectRevert("StreamingWallet: Session not paused");
        streamingWallet.resumeSession(sessionId);

        // Pause session
        streamingWallet.pauseSession(sessionId);

        // Try to pause again
        vm.expectRevert("StreamingWallet: Session not playing");
        streamingWallet.pauseSession(sessionId);
        vm.stopPrank();
    }

    function testZeroValues() public {
        vm.startPrank(alice);

        // Invalid content ID
        vm.expectRevert("StreamingWallet: Invalid content ID");
        streamingWallet.startSession(bytes32(0), PRICE_PER_SECOND);

        // Zero price
        vm.expectRevert("StreamingWallet: Price must be > 0");
        streamingWallet.startSession(CONTENT_ID, 0);
        vm.stopPrank();
    }

    function testPaymentRounding() public {
        vm.startPrank(alice);
        uint256 sessionId = streamingWallet.startSession(CONTENT_ID, 333); // Odd price

        vm.warp(block.timestamp + 7); // 7 seconds
        streamingWallet.stopSession(sessionId, 7);
        vm.stopPrank();

        // 7 * 333 = 2331
        // With rounding: (2331 + 999) / 1000 * 1000 = 3000
        assertEq(usdt.balanceOf(address(streamingWallet)), 3000);
    }
}