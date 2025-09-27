// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/YieldVault.sol";
import "../src/MockUSDC.sol";
import "../src/StreamingWallet.sol";

contract StreamingWalletTest is Test {
    YieldVault vault;
    MockUSDC usdc;
    StreamingWallet streamingWallet;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address owner = makeAddr("owner");

    bytes32 constant CONTENT_ID_1 = bytes32(uint256(1));
    bytes32 constant CONTENT_ID_2 = bytes32(uint256(2));
    uint128 constant CONTENT_1_PRICE = 5 * 1e6; // 5 USDC total
    uint64 constant CONTENT_1_DURATION = 3600; // 1 hour in seconds

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();

        vm.prank(owner);
        vault = new YieldVault(IERC20(address(usdc)), "Yield Vault", "YV", 500); // 5% APY

        vm.prank(owner);
        streamingWallet = new StreamingWallet(address(vault));

        // Mint tokens to test users
        vm.prank(owner);
        usdc.mint(alice, 10000 * 1e6); // 10,000 USDC

        vm.prank(owner);
        usdc.mint(bob, 10000 * 1e6); // 10,000 USDC

        // Set up content
        vm.prank(owner);
        streamingWallet.listContent(CONTENT_ID_1, CONTENT_1_PRICE, CONTENT_1_DURATION);

        vm.prank(owner);
        streamingWallet.listContent(CONTENT_ID_2, 10 * 1e6, 7200); // 10 USDC for 2 hours

        // Set vault in MockUSDC for auto-yield functionality
        vm.prank(owner);
        usdc.setVault(address(vault));
    }

    function testInitialState() public view {
        assertEq(address(streamingWallet.vault()), address(vault));
    }

    function testDepositAndCheckBalances() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Check balances
        assertEq(vault.principalOf(alice), depositAmount);
        assertEq(vault.yieldOf(alice), 0); // No yield yet
        assertEq(vault.balanceOf(alice), depositAmount);
    }

    function testStartAndStopStream() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        // Alice deposits into vault
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);

        // Approve streaming wallet to spend vault shares
        vault.approve(address(streamingWallet), type(uint256).max);

        // Start stream
        streamingWallet.startStream(CONTENT_ID_1);

        // Check stream started (session should be active)
        (bool isActive,,,) = streamingWallet.userSessions(alice, CONTENT_ID_1);
        assertTrue(isActive);

        // Stop stream immediately (zero consumption)
        streamingWallet.stopStream(CONTENT_ID_1);

        // Check stream stopped (session should be inactive)
        (isActive,,,) = streamingWallet.userSessions(alice, CONTENT_ID_1);
        assertFalse(isActive);

        vm.stopPrank();
    }

    function testStreamNonExistentContent() public {
        vm.prank(alice);
        vm.expectRevert("StreamingWallet: Content not listed");
        streamingWallet.startStream(bytes32(uint256(999))); // Non-existent content
    }

    function testZeroConsumptionPayment() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vault.approve(address(streamingWallet), type(uint256).max);

        // Start and immediately stop stream
        streamingWallet.startStream(CONTENT_ID_1);
        streamingWallet.stopStream(CONTENT_ID_1);

        // No payment should have been made
        assertEq(vault.principalOf(alice), depositAmount);
        assertEq(vault.yieldOf(alice), 0);

        vm.stopPrank();
    }

    function testGetCurrentCostWhileStreaming() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vault.approve(address(streamingWallet), type(uint256).max);

        // Start stream
        streamingWallet.startStream(CONTENT_ID_1);

        // Initially cost should be 0
        assertEq(streamingWallet.getCurrentCost(alice, CONTENT_ID_1), 0);

        // Advance time by 1 hour (3600 seconds)
        vm.warp(block.timestamp + 3600);

        // Cost should be approximately the full price (5 USDC)
        uint256 currentCost = streamingWallet.getCurrentCost(alice, CONTENT_ID_1);
        assertApproxEqAbs(currentCost, CONTENT_1_PRICE, 1e3); // Allow small variance

        vm.stopPrank();
    }

    function testMultipleUsersCanStream() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC each

        // Alice deposits and starts streaming
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vault.approve(address(streamingWallet), type(uint256).max);
        streamingWallet.startStream(CONTENT_ID_1);
        vm.stopPrank();

        // Bob deposits and starts streaming different content
        vm.startPrank(bob);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, bob);
        vault.approve(address(streamingWallet), type(uint256).max);
        streamingWallet.startStream(CONTENT_ID_2);
        vm.stopPrank();

        // Both should be streaming (isActive = true)
        (bool aliceActive,,,) = streamingWallet.userSessions(alice, CONTENT_ID_1);
        (bool bobActive,,,) = streamingWallet.userSessions(bob, CONTENT_ID_2);
        assertTrue(aliceActive);
        assertTrue(bobActive);

        // Stop both streams
        vm.prank(alice);
        streamingWallet.stopStream(CONTENT_ID_1);

        vm.prank(bob);
        streamingWallet.stopStream(CONTENT_ID_2);

        // Both should be stopped (isActive = false)
        (aliceActive,,,) = streamingWallet.userSessions(alice, CONTENT_ID_1);
        (bobActive,,,) = streamingWallet.userSessions(bob, CONTENT_ID_2);
        assertFalse(aliceActive);
        assertFalse(bobActive);
    }

    function testCannotStartStreamTwice() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vault.approve(address(streamingWallet), type(uint256).max);

        streamingWallet.startStream(CONTENT_ID_1);

        vm.expectRevert("StreamingWallet: Stream is already active");
        streamingWallet.startStream(CONTENT_ID_1);

        vm.stopPrank();
    }

    function testCannotStopInactiveStream() public {
        vm.prank(alice);
        vm.expectRevert("StreamingWallet: Stream was never started");
        streamingWallet.stopStream(CONTENT_ID_1);
    }

    function testStreamingWithInstantYield() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        // Use mintWithYield to give Alice instant yield
        vm.prank(owner);
        usdc.mintWithYield(alice, depositAmount);

        // Check Alice has yield available
        uint256 yieldBefore = vault.yieldOf(alice);
        assertGt(yieldBefore, 0); // Should have 20% yield

        vm.startPrank(alice);
        vault.approve(address(streamingWallet), type(uint256).max);

        // Start stream
        streamingWallet.startStream(CONTENT_ID_1);

        // Advance time to consume some content (30 minutes = half hour)
        vm.warp(block.timestamp + 1800); // 30 minutes

        // Stop stream and pay from yield
        streamingWallet.stopStream(CONTENT_ID_1);

        // Check that yield was consumed for payment
        uint256 yieldAfter = vault.yieldOf(alice);
        assertLt(yieldAfter, yieldBefore); // Yield should have decreased

        // Principal should remain untouched
        assertEq(vault.principalOf(alice), depositAmount);

        vm.stopPrank();
    }
}