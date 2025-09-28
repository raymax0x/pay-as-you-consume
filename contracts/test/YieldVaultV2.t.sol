// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/YieldVault.sol";
import "../src/MockUSDT.sol";

contract YieldVaultV2Test is Test {
    YieldVault public vault;
    MockUSDT public usdt;

    address public owner = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);

    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 1e6; // 1M USDT
    uint256 public constant APY_BASIS_POINTS = 500; // 5% APY

    function setUp() public {
        vm.startPrank(owner);

        // Deploy MockUSDT
        usdt = new MockUSDT();

        // Deploy YieldVault
        vault = new YieldVault(
            IERC20(address(usdt)),
            "Yield USDT",
            "yUSDT",
            APY_BASIS_POINTS
        );

        // Mint initial USDT
        usdt.mint(alice, INITIAL_SUPPLY);
        usdt.mint(bob, INITIAL_SUPPLY);

        // Transfer ownership of MockUSDT to vault for testing
        usdt.transferOwnership(address(vault));

        vm.stopPrank();
    }

    function testDeployment() public view {
        assertEq(vault.name(), "Yield USDT");
        assertEq(vault.symbol(), "yUSDT");
        assertEq(address(vault.asset()), address(usdt));
        assertEq(vault.apyBasisPoints(), APY_BASIS_POINTS);
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.totalSupply(), 0);
    }

    function testDeposit() public {
        uint256 depositAmount = 1000 * 1e6; // 1000 USDT

        vm.startPrank(alice);
        usdt.approve(address(vault), depositAmount);

        uint256 shares = vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // First deposit should mint 1:1 shares
        assertEq(shares, depositAmount);
        assertEq(vault.balanceOf(alice), depositAmount);
        assertEq(vault.principalOf(alice), depositAmount);
        assertEq(vault.totalPrincipal(), depositAmount);
        assertEq(vault.totalAssets(), depositAmount);
    }

    function testMultipleDeposits() public {
        uint256 aliceDeposit = 1000 * 1e6;
        uint256 bobDeposit = 500 * 1e6;

        // Alice deposits
        vm.startPrank(alice);
        usdt.approve(address(vault), aliceDeposit);
        vault.deposit(aliceDeposit, alice);
        vm.stopPrank();

        // Bob deposits
        vm.startPrank(bob);
        usdt.approve(address(vault), bobDeposit);
        vault.deposit(bobDeposit, bob);
        vm.stopPrank();

        assertEq(vault.principalOf(alice), aliceDeposit);
        assertEq(vault.principalOf(bob), bobDeposit);
        assertEq(vault.totalPrincipal(), aliceDeposit + bobDeposit);
        assertEq(vault.totalAssets(), aliceDeposit + bobDeposit);
    }

    function testYieldGeneration() public {
        uint256 depositAmount = 1000 * 1e6;

        // Alice deposits
        vm.startPrank(alice);
        usdt.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Owner simulates yield
        vm.startPrank(owner);
        uint256 yieldAmount = 50 * 1e6; // 50 USDT yield
        vault.simulateYield(yieldAmount);
        vm.stopPrank();

        // Check yield is reflected
        assertEq(vault.yieldOf(alice), yieldAmount);
        assertEq(vault.totalAssets(), depositAmount + yieldAmount);
        assertEq(vault.principalOf(alice), depositAmount); // Principal unchanged
    }

    function testWithdrawYieldFirst() public {
        uint256 depositAmount = 1000 * 1e6;
        uint256 yieldAmount = 50 * 1e6;
        uint256 withdrawAmount = 30 * 1e6;

        // Alice deposits
        vm.startPrank(alice);
        usdt.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Generate yield
        vm.startPrank(owner);
        vault.simulateYield(yieldAmount);
        vm.stopPrank();

        // Alice withdraws less than yield
        vm.startPrank(alice);
        uint256 sharesBurned = vault.withdraw(withdrawAmount, alice, alice);
        vm.stopPrank();

        // Should withdraw from yield first
        assertEq(vault.yieldOf(alice), yieldAmount - withdrawAmount);
        assertEq(vault.principalOf(alice), depositAmount); // Principal untouched
        assertEq(usdt.balanceOf(alice), INITIAL_SUPPLY - depositAmount + withdrawAmount);
    }

    function testWithdrawExceedsYield() public {
        uint256 depositAmount = 1000 * 1e6;
        uint256 yieldAmount = 50 * 1e6;
        uint256 withdrawAmount = 80 * 1e6; // More than yield

        // Alice deposits
        vm.startPrank(alice);
        usdt.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Generate yield
        vm.startPrank(owner);
        vault.simulateYield(yieldAmount);
        vm.stopPrank();

        // Alice withdraws more than yield
        vm.startPrank(alice);
        vault.withdraw(withdrawAmount, alice, alice);
        vm.stopPrank();

        // Should use all yield + some principal
        assertEq(vault.yieldOf(alice), 0);
        assertEq(vault.principalOf(alice), depositAmount - (withdrawAmount - yieldAmount));
        assertEq(usdt.balanceOf(alice), INITIAL_SUPPLY - depositAmount + withdrawAmount);
    }

    function testConvertFunctions() public {
        uint256 depositAmount = 1000 * 1e6;

        // Alice deposits
        vm.startPrank(alice);
        usdt.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        // Test convert functions
        uint256 assetsForShares = vault.convertToAssets(depositAmount);
        uint256 sharesForAssets = vault.convertToShares(depositAmount);

        assertEq(assetsForShares, depositAmount);
        assertEq(sharesForAssets, depositAmount);

        // After yield generation
        vm.startPrank(owner);
        vault.simulateYield(100 * 1e6);
        vm.stopPrank();

        // Conversion should reflect yield
        uint256 newAssetsForShares = vault.convertToAssets(depositAmount);
        assertGt(newAssetsForShares, depositAmount);
    }

    function testAPYUpdate() public {
        uint256 newAPY = 1000; // 10%

        vm.startPrank(owner);
        vault.setAPY(newAPY);
        vm.stopPrank();

        assertEq(vault.apyBasisPoints(), newAPY);
    }

    function testInvalidAPY() public {
        vm.startPrank(owner);
        vm.expectRevert("YieldVault: APY cannot exceed 100%");
        vault.setAPY(10001); // > 100%
        vm.stopPrank();
    }

    function testUnauthorizedAPYUpdate() public {
        vm.startPrank(alice);
        vm.expectRevert();
        vault.setAPY(1000);
        vm.stopPrank();
    }

    function testUnauthorizedYieldSimulation() public {
        vm.startPrank(alice);
        vm.expectRevert();
        vault.simulateYield(100 * 1e6);
        vm.stopPrank();
    }
}