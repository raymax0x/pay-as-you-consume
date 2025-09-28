// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/YieldVault.sol";
import "../src/StreamingWallet.sol";

/**
 * @title Deploy
 * @notice Simplified deployment script for UI testing
 * @dev Deploys MockUSDC, YieldVault, and StreamingWallet with metadata export
 */
contract Deploy is Script {
    function run() external {
        // Load configuration from environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 yieldAPY = vm.envOr("YIELD_APY", uint256(500)); // Default 5% APY (500 basis points)
        string memory vaultName = vm.envOr("VAULT_NAME", string("Yield USDC Vault"));
        string memory vaultSymbol = vm.envOr("VAULT_SYMBOL", string("yUSDC"));
        
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Yield APY:", yieldAPY, "basis points");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        // 2. Deploy YieldVault
        YieldVault yieldVault = new YieldVault(
            mockUSDC,
            vaultName,
            vaultSymbol,
            yieldAPY
        );
        console.log("YieldVault deployed at:", address(yieldVault));

        // 3. Set vault address in MockUSDC for auto-yield functionality
        mockUSDC.setVault(address(yieldVault));
        console.log("MockUSDC vault address set to:", address(yieldVault));

        // 4. Deploy StreamingWallet
        StreamingWallet streamingWallet = new StreamingWallet(address(yieldVault));
        console.log("StreamingWallet deployed at:", address(streamingWallet));

        // 5. Setup demo content for UI testing
        _setupDemoContent(streamingWallet);

        // 6. Setup demo accounts with tokens for UI testing
        _setupDemoAccounts(mockUSDC);

        vm.stopBroadcast();

        // 7. Export deployment metadata for UI
        _exportDeploymentMetadata(deployer, address(mockUSDC), address(yieldVault), address(streamingWallet), yieldAPY);

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDC:", address(mockUSDC));
        console.log("YieldVault:", address(yieldVault));
        console.log("StreamingWallet:", address(streamingWallet));
        console.log("Demo content and accounts setup for UI testing");
    }

    function _setupDemoContent(StreamingWallet streamingWallet) internal {
        // Demo content for UI testing
        bytes32 contentId1 = keccak256("intro-to-defi");
        bytes32 contentId2 = keccak256("yield-farming-guide");
        bytes32 contentId3 = keccak256("smart-contracts-101");
        bytes32 contentId4 = keccak256("advanced-strategies");

        streamingWallet.listContent(contentId1, 10000000, 3600);  // 10 USDC, 1 hour
        streamingWallet.listContent(contentId2, 15000000, 2700);  // 15 USDC, 45 min
        streamingWallet.listContent(contentId3, 8000000, 2400);   // 8 USDC, 40 min
        streamingWallet.listContent(contentId4, 25000000, 7200); // 25 USDC, 2 hours

        console.log("Demo content listed:");
        console.log("- intro-to-defi: 10 USDC, 3600s");
        console.log("- yield-farming-guide: 15 USDC, 2700s");
        console.log("- smart-contracts-101: 8 USDC, 2400s");
        console.log("- advanced-strategies: 25 USDC, 7200s");
    }

    function _setupDemoAccounts(MockUSDC mockUSDC) internal {
        // Demo accounts for UI testing
        address[] memory demoAccounts = new address[](3);
        demoAccounts[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Account 0
        demoAccounts[1] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Account 1
        demoAccounts[2] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Account 2

        for (uint i = 0; i < demoAccounts.length; i++) {
            // Mint 1000 USDC to each demo account for testing
            mockUSDC.mint(demoAccounts[i], 1000000000); // 1000 USDC with 6 decimals

            // Mint with yield (200 USDC + 40 USDC instant yield)
            mockUSDC.mintWithYield(demoAccounts[i], 200000000); // 200 USDC principal + 20% yield

            console.log("Setup demo account:", demoAccounts[i]);
            console.log("- Minted 1000 USDC for testing");
            console.log("- Deposited 200 USDC + 40 USDC instant yield to vault");
        }
    }

    function _exportDeploymentMetadata(
        address deployer,
        address mockUSDC,
        address yieldVault,
        address streamingWallet,
        uint256 yieldAPY
    ) internal {
        uint256 chainId = block.chainid;
        
        // Export comprehensive metadata for UI
        string memory metadata = string(abi.encodePacked(
            '{\n',
            '  "chainId": ', vm.toString(chainId), ',\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "contracts": {\n',
            '    "mockUSDC": {\n',
            '      "address": "', vm.toString(mockUSDC), '",\n',
            '      "name": "Mock USD Coin",\n',
            '      "symbol": "MockUSDC",\n',
            '      "decimals": 6\n',
            '    },\n',
            '    "yieldVault": {\n',
            '      "address": "', vm.toString(yieldVault), '",\n',
            '      "name": "Yield USDC Vault",\n',
            '      "symbol": "yUSDC",\n',
            '      "apy": ', vm.toString(yieldAPY), ',\n',
            '      "apyPercentage": ', vm.toString(yieldAPY / 100), ',\n',
            '      "underlyingAsset": "', vm.toString(mockUSDC), '"\n',
            '    },\n',
            '    "streamingWallet": {\n',
            '      "address": "', vm.toString(streamingWallet), '",\n',
            '      "vaultAddress": "', vm.toString(yieldVault), '"\n',
            '    }\n',
            '  },\n',
            '  "demoAccounts": [\n',
            '    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",\n',
            '    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",\n',
            '    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"\n',
            '  ],\n',
            '  "demoContent": [\n',
            '    {\n',
            '      "id": "intro-to-defi",\n',
            '      "contentId": "0x', vm.toString(keccak256("intro-to-defi")), '",\n',
            '      "price": "10000000",\n',
            '      "duration": 3600,\n',
            '      "priceInTokens": "10"\n',
            '    },\n',
            '    {\n',
            '      "id": "yield-farming-guide",\n',
            '      "contentId": "0x', vm.toString(keccak256("yield-farming-guide")), '",\n',
            '      "price": "15000000",\n',
            '      "duration": 2700,\n',
            '      "priceInTokens": "15"\n',
            '    },\n',
            '    {\n',
            '      "id": "smart-contracts-101",\n',
            '      "contentId": "0x', vm.toString(keccak256("smart-contracts-101")), '",\n',
            '      "price": "8000000",\n',
            '      "duration": 2400,\n',
            '      "priceInTokens": "8"\n',
            '    },\n',
            '    {\n',
            '      "id": "advanced-strategies",\n',
            '      "contentId": "0x', vm.toString(keccak256("advanced-strategies")), '",\n',
            '      "price": "25000000",\n',
            '      "duration": 7200,\n',
            '      "priceInTokens": "25"\n',
            '    }\n',
            '  ],\n',
            '  "deploymentTime": ', vm.toString(block.timestamp), ',\n',
            '  "deploymentBlock": ', vm.toString(block.number), '\n',
            '}'
        ));

        string memory filename = string(abi.encodePacked("deployments/", vm.toString(chainId), ".json"));
        vm.writeFile(filename, metadata);
        console.log("Deployment metadata written to", filename);

        // Also write a simple .env format for easy integration
        string memory envContent = string(abi.encodePacked(
            "# Contract Addresses - Chain ID: ", vm.toString(chainId), "\n",
            "CHAIN_ID=", vm.toString(chainId), "\n",
            "DEPLOYER_ADDRESS=", vm.toString(deployer), "\n",
            "MOCK_USDC_ADDRESS=", vm.toString(mockUSDC), "\n",
            "YIELD_VAULT_ADDRESS=", vm.toString(yieldVault), "\n",
            "STREAMING_WALLET_ADDRESS=", vm.toString(streamingWallet), "\n",
            "YIELD_APY=", vm.toString(yieldAPY), "\n"
        ));

        vm.writeFile("deployments/.env.contracts", envContent);
        console.log("Contract addresses written to deployments/.env.contracts");
    }
}
