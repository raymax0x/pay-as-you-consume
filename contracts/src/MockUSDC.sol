// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IYieldVaultSimple {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function simulateYield(address user, uint256 amount) external;
}

/**
 * @title MockUSDC
 * @author ETHGlobal Team
 * @notice A mock USDC token for testing purposes with auto-yield functionality
 * @dev This contract mimics USDC with 6 decimals and includes special functions for instant yield
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    IYieldVaultSimple public vault;

    constructor() ERC20("Mock USD Coin", "MockUSDC") Ownable(msg.sender) {}

    /**
     * @notice Returns the number of decimals used by the token (6 like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mints tokens to a specified address (for testing)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Public mint function for easy testing (anyone can mint)
     * @param amount The amount of tokens to mint to the caller
     */
    function publicMint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /**
     * @notice Mints tokens with proper decimals (convenience function)
     * @param to The address to mint tokens to
     * @param amountInTokens The amount in token units (will be multiplied by 10^decimals)
     */
    function mintTokens(address to, uint256 amountInTokens) external onlyOwner {
        _mint(to, amountInTokens * 10**DECIMALS);
    }

    /**
     * @notice Sets the vault address for auto-yield functionality
     * @param _vault The YieldVault contract address
     */
    function setVault(address _vault) external onlyOwner {
        vault = IYieldVaultSimple(_vault);
    }

    /**
     * @notice Mints tokens and automatically deposits them with 20% instant yield
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * @dev This function mints tokens, deposits them in vault, and adds 20% yield instantly
     */
    function mintWithYield(address to, uint256 amount) external onlyOwner {
        require(address(vault) != address(0), "MockUSDC: Vault not set");

        // Calculate 20% yield
        uint256 yieldAmount = (amount * 20) / 100;
        uint256 totalAmount = amount + yieldAmount;

        // Mint total amount (principal + yield)
        _mint(address(this), totalAmount);

        // Approve vault to spend tokens
        _approve(address(this), address(vault), totalAmount);

        // Deposit principal amount to vault for the user
        vault.deposit(amount, to);

        // Simulate additional yield (20% of principal)
        vault.simulateYield(to, yieldAmount);
    }
}
