// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @author ETHGlobal Team
 * @notice A mock USDT token for testing purposes with 6 decimals
 * @dev This contract mimics USDT with 6 decimals for testing the DeFi system
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock Tether USD", "MockUSDT") Ownable(msg.sender) {}

    /**
     * @notice Returns the number of decimals used by the token (6 like USDT)
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
}