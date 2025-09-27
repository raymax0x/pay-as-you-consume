// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/YieldVault.sol";
import "../src/StreamingWallet.sol";

contract DeployLocal is Script {
    function run() external {
        // Use first anvil account
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        // 2. Deploy YieldVault (5% APY = 500 basis points)
        YieldVault yieldVault = new YieldVault(
            mockUSDC,
            "Yield USDC",
            "yUSDC",
            500 // 5% APY
        );
        console.log("YieldVault deployed at:", address(yieldVault));

        // 3. Set vault address in MockUSDC for auto-yield functionality
        mockUSDC.setVault(address(yieldVault));
        console.log("MockUSDC vault address set to:", address(yieldVault));

        // 4. Deploy StreamingWallet
        StreamingWallet streamingWallet = new StreamingWallet(address(yieldVault));
        console.log("StreamingWallet deployed at:", address(streamingWallet));

        // 5. Setup demo content in StreamingWallet
        bytes32 contentId1 = keccak256("intro-to-defi");
        bytes32 contentId2 = keccak256("yield-farming-guide");
        bytes32 contentId3 = keccak256("smart-contracts-101");

        streamingWallet.listContent(contentId1, 10000000, 3600); // 10 USDC, 1 hour
        streamingWallet.listContent(contentId2, 15000000, 2700); // 15 USDC, 45 min
        streamingWallet.listContent(contentId3, 8000000, 2400);  // 8 USDC, 40 min

        console.log("Demo content listed:");
        console.log("- intro-to-defi: 10 USDC, 3600s");
        console.log("- yield-farming-guide: 15 USDC, 2700s");
        console.log("- smart-contracts-101: 8 USDC, 2400s");

        // 6. Mint tokens and set up demo accounts
        address[] memory demoAccounts = new address[](3);
        demoAccounts[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Account 0
        demoAccounts[1] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Account 1
        demoAccounts[2] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Account 2

        for (uint i = 0; i < demoAccounts.length; i++) {
            // Mint 1000 USDC to each demo account
            mockUSDC.mint(demoAccounts[i], 1000000000); // 1000 USDC with 6 decimals

            // Mint with yield (200 USDC + 40 USDC instant yield)
            mockUSDC.mintWithYield(demoAccounts[i], 200000000); // 200 USDC principal + 20% yield

            console.log("Setup demo account:", demoAccounts[i]);
            console.log("- Minted 1000 USDC for testing");
            console.log("- Deposited 200 USDC + 40 USDC instant yield to vault");
        }

        vm.stopBroadcast();

        // 7. Write deployment addresses to file
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "chainId": 31337,\n',
            '  "mockUSDC": "', vm.toString(address(mockUSDC)), '",\n',
            '  "yieldVault": "', vm.toString(address(yieldVault)), '",\n',
            '  "streamingWallet": "', vm.toString(address(streamingWallet)), '",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "demoAccounts": [\n',
            '    "', vm.toString(demoAccounts[0]), '",\n',
            '    "', vm.toString(demoAccounts[1]), '",\n',
            '    "', vm.toString(demoAccounts[2]), '"\n',
            '  ]\n',
            '}'
        ));

        vm.writeFile("deployments/local.json", json);
        console.log("Deployment addresses written to deployments/local.json");

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDC:", address(mockUSDC));
        console.log("YieldVault:", address(yieldVault));
        console.log("StreamingWallet:", address(streamingWallet));
        console.log("Demo accounts setup with tokens and vault deposits");
    }
}