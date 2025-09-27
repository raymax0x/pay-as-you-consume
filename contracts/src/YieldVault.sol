// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title YieldVault
 * @author ETHGlobal Team
 * @notice An ERC4626 vault that tracks principal and yield separately for pay-per-use micropayments
 * @dev Extends ERC4626 to provide separate tracking of user principal deposits and accrued yield
 * This is crucial for the StreamingWallet's "deduct from yield first" payment logic
 */
contract YieldVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    //================================================================
    // State Variables
    //================================================================

    /// @notice Tracks the principal amount deposited by each user
    mapping(address => uint256) public principalOf;
    
    /// @notice Tracks the total principal deposited across all users
    uint256 public totalPrincipal;

    /// @notice Annual Percentage Yield in basis points (e.g., 500 = 5%)
    uint256 public apyBasisPoints;

    /// @notice Timestamp when yield calculation was last updated
    uint256 public lastYieldUpdate;

    /// @notice Accumulated yield per share (scaled by 1e18)
    uint256 public accumulatedYieldPerShare;

    /// @notice Tracks the yield debt for each user (for yield calculation)
    mapping(address => uint256) public yieldDebt;

    //================================================================
    // Events
    //================================================================

    event YieldGenerated(uint256 totalYield, uint256 timestamp);
    event APYUpdated(uint256 oldAPY, uint256 newAPY);
    event YieldWithdrawn(address indexed user, uint256 amount);
    event PrincipalWithdrawn(address indexed user, uint256 amount);

    //================================================================
    // Constructor
    //================================================================

    /**
     * @param _asset The underlying ERC20 asset (e.g., USDC)
     * @param _name The name of the vault token (e.g., "Yield USDC")
     * @param _symbol The symbol of the vault token (e.g., "yUSDC")
     * @param _apyBasisPoints Annual percentage yield in basis points (e.g., 500 for 5%)
     */
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        uint256 _apyBasisPoints
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_apyBasisPoints <= 10000, "YieldVault: APY cannot exceed 100%");
        apyBasisPoints = _apyBasisPoints;
        lastYieldUpdate = block.timestamp;
    }

    //================================================================
    // Owner Functions
    //================================================================

    /**
     * @notice Updates the annual percentage yield
     * @param _newAPY New APY in basis points
     */
    function setAPY(uint256 _newAPY) external onlyOwner {
        require(_newAPY <= 10000, "YieldVault: APY cannot exceed 100%");
        
        // Update yield before changing APY
        _updateYield();
        
        uint256 oldAPY = apyBasisPoints;
        apyBasisPoints = _newAPY;
        
        emit APYUpdated(oldAPY, _newAPY);
    }

    /**
     * @notice Simulates yield for a user (for testing purposes)
     * @param user The address of the user
     * @param amount The amount of yield to simulate
     * @dev This function is used by MockUSDC to instantly provide yield for testing
     */
    function simulateYield(address user, uint256 amount) external {
        require(msg.sender == address(asset()), "YieldVault: Only MockUSDC can simulate yield");

        // Increase the accumulated yield per share
        if (totalSupply() > 0) {
            uint256 yieldPerShare = (amount * 1e18) / totalSupply();
            accumulatedYieldPerShare += yieldPerShare;
        }

        // Transfer the yield tokens to this contract
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
    }

    //================================================================
    // Public View Functions
    //================================================================

    /**
     * @notice Returns the yield balance for a specific user
     * @param user The address of the user
     * @return The amount of yield available to the user
     */
    function yieldOf(address user) external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        
        uint256 currentAccumulated = _getCurrentAccumulatedYieldPerShare();
        uint256 userShares = balanceOf(user);
        
        if (userShares == 0) return 0;
        
        uint256 userTotalYield = (userShares * currentAccumulated) / 1e18;
        uint256 userDebt = yieldDebt[user];

        return userTotalYield > userDebt ? userTotalYield - userDebt : 0;
    }

    /**
     * @notice Returns the current total yield available across all users
     * @return The total yield amount
     */
    function totalYield() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return totalAssets() - totalPrincipal;
    }

    //================================================================
    // Internal Functions
    //================================================================

    /**
     * @notice Updates yield calculations before any balance-changing operation
     */
    function _updateYield() internal {
        if (totalSupply() == 0) {
            lastYieldUpdate = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastYieldUpdate;
        if (timeElapsed == 0) return;

        // Calculate yield: principal * APY * timeElapsed / (365 days * 10000)
        uint256 yieldGenerated = (totalPrincipal * apyBasisPoints * timeElapsed) / (365 days * 10000);
        
        if (yieldGenerated > 0) {
            // Update accumulated yield per share
            accumulatedYieldPerShare += (yieldGenerated * 1e18) / totalSupply();
            
            emit YieldGenerated(yieldGenerated, block.timestamp);
        }
        
        lastYieldUpdate = block.timestamp;
    }

    /**
     * @notice Returns the current accumulated yield per share including pending yield
     */
    function _getCurrentAccumulatedYieldPerShare() internal view returns (uint256) {
        if (totalSupply() == 0) return accumulatedYieldPerShare;
        
        uint256 timeElapsed = block.timestamp - lastYieldUpdate;
        if (timeElapsed == 0) return accumulatedYieldPerShare;
        
        uint256 pendingYield = (totalPrincipal * apyBasisPoints * timeElapsed) / (365 days * 10000);
        uint256 pendingYieldPerShare = pendingYield > 0 ? (pendingYield * 1e18) / totalSupply() : 0;
        
        return accumulatedYieldPerShare + pendingYieldPerShare;
    }

    /**
     * @notice Updates user's yield debt (called on balance changes)
     */
    function _updateUserYieldDebt(address user) internal {
        uint256 userShares = balanceOf(user);
        yieldDebt[user] = (userShares * accumulatedYieldPerShare) / 1e18;
    }

    //================================================================
    // ERC4626 Overrides
    //================================================================

    /**
     * @notice Override deposit to track principal and update yield
     */
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        _updateYield();
        
        uint256 shares = super.deposit(assets, receiver);
        
        // Update principal tracking
        principalOf[receiver] += assets;
        totalPrincipal += assets;
        
        // Update yield debt for the receiver
        _updateUserYieldDebt(receiver);
        
        return shares;
    }

    /**
     * @notice Override mint to track principal and update yield
     */
    function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
        _updateYield();
        
        uint256 assets = super.mint(shares, receiver);
        
        // Update principal tracking
        principalOf[receiver] += assets;
        totalPrincipal += assets;
        
        // Update yield debt for the receiver
        _updateUserYieldDebt(receiver);
        
        return assets;
    }

    /**
     * @notice Override withdraw to handle principal vs yield withdrawal
     */
    function withdraw(uint256 assets, address receiver, address owner) public virtual override returns (uint256) {
        _updateYield();
        
        // Calculate user's available yield
        uint256 userYield = this.yieldOf(owner);
        uint256 fromYield = Math.min(assets, userYield);
        uint256 fromPrincipal = assets - fromYield;
        
        // Ensure user has enough principal if needed
        if (fromPrincipal > 0) {
            require(principalOf[owner] >= fromPrincipal, "YieldVault: Insufficient principal");
            principalOf[owner] -= fromPrincipal;
            totalPrincipal -= fromPrincipal;
        }
        
        uint256 shares = super.withdraw(assets, receiver, owner);
        
        // Update yield debt for the owner
        _updateUserYieldDebt(owner);
        
        // Emit specific events for tracking
        if (fromYield > 0) {
            emit YieldWithdrawn(owner, fromYield);
        }
        if (fromPrincipal > 0) {
            emit PrincipalWithdrawn(owner, fromPrincipal);
        }
        
        return shares;
    }

    /**
     * @notice Override redeem to handle principal vs yield withdrawal
     */
    function redeem(uint256 shares, address receiver, address owner) public virtual override returns (uint256) {
        _updateYield();
        
        uint256 assets = super.redeem(shares, receiver, owner);
        
        // Calculate how much comes from yield vs principal
        uint256 userYield = this.yieldOf(owner);
        uint256 fromYield = Math.min(assets, userYield);
        uint256 fromPrincipal = assets - fromYield;
        
        // Update principal tracking
        if (fromPrincipal > 0) {
            principalOf[owner] = principalOf[owner] >= fromPrincipal ? 
                principalOf[owner] - fromPrincipal : 0;
            totalPrincipal = totalPrincipal >= fromPrincipal ? 
                totalPrincipal - fromPrincipal : 0;
        }
        
        // Update yield debt for the owner
        _updateUserYieldDebt(owner);
        
        // Emit specific events for tracking
        if (fromYield > 0) {
            emit YieldWithdrawn(owner, fromYield);
        }
        if (fromPrincipal > 0) {
            emit PrincipalWithdrawn(owner, fromPrincipal);
        }
        
        return assets;
    }

    /**
     * @notice Override transfer to update yield debt for both parties
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0)) {
            _updateYield();
        }
        
        super._update(from, to, value);
        
        // Update yield debt for both parties after transfer
        if (from != address(0)) {
            _updateUserYieldDebt(from);
        }
        if (to != address(0)) {
            _updateUserYieldDebt(to);
        }
    }

    //================================================================
    // Total Assets Override (includes yield)
    //================================================================

    /**
     * @notice Override totalAssets to include generated yield
     * @dev This ensures the vault's total assets include both principal and accrued yield
     */
    function totalAssets() public view virtual override returns (uint256) {
        uint256 baseAssets = IERC20(asset()).balanceOf(address(this));
        
        if (totalPrincipal == 0) return baseAssets;
        
        // Calculate pending yield
        uint256 timeElapsed = block.timestamp - lastYieldUpdate;
        uint256 pendingYield = (totalPrincipal * apyBasisPoints * timeElapsed) / (365 days * 10000);
        
        return baseAssets + pendingYield;
    }
}
