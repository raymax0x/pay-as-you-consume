// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/YieldVault.sol";
import "../src/MockUSDC.sol";

contract YieldVaultTest is Test {
    YieldVault vault;
    MockUSDC usdc;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address owner = makeAddr("owner");

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();

        vm.prank(owner);
        vault = new YieldVault(IERC20(address(usdc)), "Yield Vault", "YV", 500); // 5% APY

        // Mint tokens to test users
        vm.prank(owner);
        usdc.mint(alice, 10000 * 1e6); // 10,000 USDC

        vm.prank(owner);
        usdc.mint(bob, 10000 * 1e6); // 10,000 USDC

        // Set vault in MockUSDC for auto-yield functionality
        vm.prank(owner);
        usdc.setVault(address(vault));
    }

    function testInitialState() public view {
        assertEq(vault.name(), "Yield Vault");
        assertEq(vault.symbol(), "YV");
        assertEq(address(vault.asset()), address(usdc));
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalPrincipal(), 0);
    }

    function testDeposit() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, alice);
        vm.stopPrank();

        assertEq(shares, depositAmount);
        assertEq(vault.balanceOf(alice), depositAmount);
        assertEq(vault.totalAssets(), depositAmount);
        assertEq(vault.totalPrincipal(), depositAmount);
        assertEq(vault.principalOf(alice), depositAmount);
    }

    function testWithdrawPrincipalAndYield() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        // Alice deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Simulate time passage for yield generation
        vm.warp(block.timestamp + 365 days);

        // Check yield was generated
        uint256 yieldAmount = vault.yieldOf(alice);
        assertGt(yieldAmount, 0);

        // Withdraw all shares
        uint256 allShares = vault.balanceOf(alice);

        vm.prank(alice);
        uint256 assets = vault.redeem(allShares, alice, alice);

        assertGe(assets, depositAmount); // Should be at least original deposit, might have yield
        assertEq(vault.balanceOf(alice), 0);
        assertGe(usdc.balanceOf(alice), 10000 * 1e6); // At least original amount
    }

    function testWithdrawYieldOnly() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        // Alice deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Simulate time passage for yield generation
        vm.warp(block.timestamp + 365 days);

        // Get yield amount
        uint256 yieldAmount = vault.yieldOf(alice);
        assertGt(yieldAmount, 0);

        // Withdraw only yield
        vm.prank(alice);
        vault.withdraw(yieldAmount, alice, alice);

        // Principal should remain
        assertEq(vault.principalOf(alice), depositAmount);
        assertEq(vault.yieldOf(alice), 0);
    }

    function testYieldGeneration() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Initially no yield
        assertEq(vault.yieldOf(alice), 0);

        // After 1 year at 5% APY
        vm.warp(block.timestamp + 365 days);
        uint256 expectedYield = (depositAmount * 5) / 100; // 5% APY
        uint256 actualYield = vault.yieldOf(alice);

        // Allow for small rounding differences
        assertApproxEqAbs(actualYield, expectedYield, 1e6);
    }

    function testYieldGenerationMultipleUsers() public {
        uint256 aliceDeposit = 6000 * 1e6; // 6,000 USDC
        uint256 bobDeposit = 4000 * 1e6;   // 4,000 USDC

        // Alice deposits first
        vm.startPrank(alice);
        usdc.approve(address(vault), aliceDeposit);
        vault.deposit(aliceDeposit, alice);
        vm.stopPrank();

        // Bob deposits later
        vm.startPrank(bob);
        usdc.approve(address(vault), bobDeposit);
        vault.deposit(bobDeposit, bob);
        vm.stopPrank();

        // Simulate time passage
        vm.warp(block.timestamp + 365 days);

        uint256 aliceYield = vault.yieldOf(alice);
        uint256 bobYield = vault.yieldOf(bob);

        // Alice should have more yield since she deposited more
        assertGt(aliceYield, bobYield);

        // Yield should be proportional to deposits (approximately)
        assertApproxEqRel(aliceYield * bobDeposit, bobYield * aliceDeposit, 0.01e18);
    }

    function testSetAPY() public {
        vm.prank(owner);
        vault.setAPY(800); // 8%

        assertEq(vault.apyBasisPoints(), 800);
    }

    function testSetAPYTooHigh() public {
        vm.prank(owner);
        vm.expectRevert("YieldVault: APY cannot exceed 100%");
        vault.setAPY(10001); // > 100%
    }

    function testVaultWithNoDeposits() public view {
        assertEq(vault.totalYield(), 0);
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.yieldOf(alice), 0);
        assertEq(vault.principalOf(alice), 0);
    }

    function testMintWithYield() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC
        uint256 expectedYield = (depositAmount * 20) / 100; // 20% yield

        // Mint with 20% instant yield
        vm.prank(owner);
        usdc.mintWithYield(alice, depositAmount);

        // Check that Alice received shares
        assertEq(vault.balanceOf(alice), depositAmount);
        assertEq(vault.principalOf(alice), depositAmount);

        // Check that yield was added (should be approximately 20%)
        uint256 actualYield = vault.yieldOf(alice);
        assertApproxEqAbs(actualYield, expectedYield, 1e6); // Allow 1 USDC variance

        // Check total assets include both principal and yield
        assertApproxEqAbs(vault.totalAssets(), depositAmount + expectedYield, 1e6);
    }

    function testWithdrawMoreThanAvailable() public {
        uint256 depositAmount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);

        // Try to withdraw more than available
        vm.expectRevert();
        vault.withdraw(depositAmount + 1, alice, alice);
        vm.stopPrank();
    }
}