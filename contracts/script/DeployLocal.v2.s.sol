// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/YieldVault.sol";
import "../src/StreamingWalletV2.sol";

/**
 * @title DeployLocalV2 Script
 * @notice Deploys the complete system to local Anvil for development
 */
contract DeployLocalV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // Anvil default
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== DEPLOYING TO LOCAL ANVIL ===");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy contracts
        MockUSDT mockUSDT = new MockUSDT();
        YieldVault yieldVault = new YieldVault(
            IERC20(address(mockUSDT)),
            "Yield USDT Vault",
            "yUSDT",
            500 // 5% APY
        );
        StreamingWalletV2 streamingWallet = new StreamingWalletV2(address(yieldVault));

        // Setup for testing
        mockUSDT.mint(deployer, 1_000_000 * 1e6); // 1M USDT
        mockUSDT.transferOwnership(address(yieldVault));

        vm.stopBroadcast();

        // Log addresses
        console.log("MockUSDT:          ", address(mockUSDT));
        console.log("YieldVault:        ", address(yieldVault));
        console.log("StreamingWalletV2: ", address(streamingWallet));

        // Save to local file
        string memory json = string.concat(
            '{\n',
            '  "chainId": 31337,\n',
            '  "mockUSDT": "', vm.toString(address(mockUSDT)), '",\n',
            '  "yieldVault": "', vm.toString(address(yieldVault)), '",\n',
            '  "streamingWalletV2": "', vm.toString(address(streamingWallet)), '"\n',
            '}'
        );
        vm.writeFile("deployments/31337-v2.json", json);
        console.log("Saved to: deployments/31337-v2.json");
    }
}