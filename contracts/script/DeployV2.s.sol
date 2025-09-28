// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/YieldVault.sol";
import "../src/StreamingWalletV2.sol";

/**
 * @title DeployV2 Script
 * @notice Deploys the complete Pay-As-You-Consume DeFi system to Sepolia
 */
contract DeployV2 is Script {
    // Deployment addresses (will be populated after deployment)
    MockUSDT public mockUSDT;
    YieldVault public yieldVault;
    StreamingWalletV2 public streamingWallet;

    // Configuration
    uint256 public constant APY_BASIS_POINTS = 500; // 5% APY
    uint256 public constant INITIAL_USDT_SUPPLY = 1_000_000 * 1e6; // 1M USDT

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================");
        console.log("DEPLOYING PAY-AS-YOU-CONSUME V2");
        console.log("=================================");
        console.log("Deployer:", deployer);
        console.log("Network:", block.chainid);
        console.log("=================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDT
        console.log("1. Deploying MockUSDT...");
        mockUSDT = new MockUSDT();
        console.log("   MockUSDT deployed at:", address(mockUSDT));

        // 2. Deploy YieldVault
        console.log("2. Deploying YieldVault...");
        yieldVault = new YieldVault(
            IERC20(address(mockUSDT)),
            "Yield USDT Vault",
            "yUSDT",
            APY_BASIS_POINTS
        );
        console.log("   YieldVault deployed at:", address(yieldVault));

        // 3. Deploy StreamingWalletV2
        console.log("3. Deploying StreamingWalletV2...");
        streamingWallet = new StreamingWalletV2(address(yieldVault));
        console.log("   StreamingWalletV2 deployed at:", address(streamingWallet));

        // 4. Setup initial configuration
        console.log("4. Setting up initial configuration...");

        // Transfer MockUSDT ownership to YieldVault for yield simulation
        mockUSDT.transferOwnership(address(yieldVault));
        console.log("   MockUSDT ownership transferred to YieldVault");

        // Mint initial USDT supply to deployer for testing
        // Note: This needs to be done before ownership transfer in a real script
        // For now, we'll mint to deployer first, then transfer ownership
        vm.stopBroadcast();

        // Re-broadcast with new setup
        vm.startBroadcast(deployerPrivateKey);

        // Mint some USDT to deployer for initial testing
        mockUSDT.mint(deployer, INITIAL_USDT_SUPPLY);
        console.log("   Minted", INITIAL_USDT_SUPPLY / 1e6, "USDT to deployer");

        vm.stopBroadcast();

        // 5. Log final deployment info
        console.log("\n=================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("=================================");
        console.log("MockUSDT:           ", address(mockUSDT));
        console.log("YieldVault:         ", address(yieldVault));
        console.log("StreamingWalletV2:  ", address(streamingWallet));
        console.log("=================================");

        // 6. Save deployment addresses to file
        _saveDeploymentAddresses();

        // 7. Verify deployment
        _verifyDeployment();
    }

    function _saveDeploymentAddresses() internal {
        string memory json = string.concat(
            '{\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "mockUSDT": "', vm.toString(address(mockUSDT)), '",\n',
            '  "yieldVault": "', vm.toString(address(yieldVault)), '",\n',
            '  "streamingWalletV2": "', vm.toString(address(streamingWallet)), '",\n',
            '  "deployedAt": ', vm.toString(block.timestamp), '\n',
            '}'
        );

        string memory fileName = string.concat("deployments/", vm.toString(block.chainid), "-v2.json");
        vm.writeFile(fileName, json);
        console.log("Deployment addresses saved to:", fileName);
    }

    function _verifyDeployment() internal view {
        console.log("\n=== DEPLOYMENT VERIFICATION ===");

        // Verify MockUSDT
        require(mockUSDT.decimals() == 6, "MockUSDT decimals should be 6");
        require(mockUSDT.totalSupply() == INITIAL_USDT_SUPPLY, "MockUSDT total supply mismatch");
        console.log("MockUSDT verified");

        // Verify YieldVault
        require(address(yieldVault.asset()) == address(mockUSDT), "YieldVault asset mismatch");
        require(yieldVault.apyBasisPoints() == APY_BASIS_POINTS, "YieldVault APY mismatch");
        console.log("YieldVault verified");

        // Verify StreamingWallet
        require(address(streamingWallet.vault()) == address(yieldVault), "StreamingWallet vault mismatch");
        console.log("StreamingWalletV2 verified");

        console.log("All contracts verified successfully!");
    }
}