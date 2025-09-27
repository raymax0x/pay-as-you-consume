// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "src/YieldVault.sol";
import "src/MockUSDC.sol";
import "src/StreamingWallet.sol";

/**
 * @title DeployContracts
 * @notice Deployment script for the complete Phase 1 system
 * @dev Deploys MockUSDC, YieldVault, and StreamingWallet in the correct order
 */
contract DeployContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC token
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy YieldVault with 5% APY
        YieldVault vault = new YieldVault(
            IERC20(address(usdc)),
            "Yield USDC Vault",
            "yUSDC",
            500 // 5% APY
        );
        console.log("YieldVault deployed at:", address(vault));

        // Deploy StreamingWallet
        StreamingWallet streamingWallet = new StreamingWallet(address(vault));
        console.log("StreamingWallet deployed at:", address(streamingWallet));

        // Setup some initial content for testing
        bytes32 contentId1 = keccak256("intro-to-defi");
        bytes32 contentId2 = keccak256("advanced-yield-farming");
        
        streamingWallet.listContent(contentId1, 10 * 1e6, 3600); // 10 USDC for 1 hour
        streamingWallet.listContent(contentId2, 25 * 1e6, 7200); // 25 USDC for 2 hours
        
        console.log("Content listed:");
        console.log("- intro-to-defi: 10 USDC for 1 hour");
        console.log("- advanced-yield-farming: 25 USDC for 2 hours");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("MockUSDC:", address(usdc));
        console.log("YieldVault:", address(vault));
        console.log("StreamingWallet:", address(streamingWallet));
        console.log("APY: 5%");
        console.log("Content pieces: 2");
    }
}

