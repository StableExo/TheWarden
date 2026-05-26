// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title CounterSweeper
 * @notice TheWarden GL-L29 Counter-Operation Contract
 * 
 * PURPOSE:
 * This contract is designed to be the EIP-7702 delegation TARGET 
 * on victim/honeypot wallets. When the attacker's deployer 
 * (0x2E5269B9) calls withdrawNative() or withdrawToken() on a 
 * wallet delegated to this contract, the funds redirect to the
 * safe beneficiary address instead of the attacker's cashout.
 *
 * ATTACK PATTERN WE COUNTER:
 *   Attacker calls: withdrawNative(0x6F1cDbBb...) on victim EOA
 *   Victim EOA is EIP-7702 delegated to attacker sweeper (0xebf985ad)
 *   Sweeper sends victim's ETH → attacker cashout
 *
 * OUR COUNTER:
 *   Victim EOA is re-delegated to THIS contract (CounterSweeper)
 *   Attacker calls: withdrawNative(0x6F1cDbBb...) on victim EOA
 *   THIS contract runs instead of their sweeper
 *   THIS contract sends ETH → OUR beneficiary (not their cashout)
 *   Attacker: wasted gas, got nothing
 *   Us: ETH safe + attacker's gas tank depletes
 *
 * FUNCTIONS mirror attacker sweeper 0xebf985ad:
 *   withdrawNative(address)          — 0x2f622e6b
 *   withdrawToken(address,address)   — 0x3aeac4e1
 *   workMyDirefulOwner(uint256,uint256) — 0xa9059cbb (obfuscated ERC20 transfer)
 *   + emergency functions for owner
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract CounterSweeper {
    
    // ── State ──────────────────────────────────────────────────────────
    address public owner;
    address public beneficiary;    // All funds redirect here
    bool    public active;         // Can be paused
    
    uint256 public totalETHRedirected;
    uint256 public totalDrainAttempts;
    uint256 public totalGasWasted;   // Estimate of attacker gas burned
    
    // Track each attacker call
    event DrainAttemptRedirected(
        address indexed caller,
        address indexed attemptedTarget, // Where attacker tried to send
        address indexed redirectedTo,    // Where we actually sent
        uint256 amount,
        uint256 timestamp
    );
    event TokenRedirected(
        address indexed token,
        address indexed attemptedTarget,
        uint256 amount
    );
    event BeneficiaryUpdated(address oldBeneficiary, address newBeneficiary);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _beneficiary) {
        owner       = msg.sender;
        beneficiary = _beneficiary;
        active      = true;
    }
    
    // ── MIRROR: withdrawNative(address) — 0x2f622e6b ─────────────────
    // Attacker calls this to drain native ETH
    // We redirect to beneficiary instead
    function withdrawNative(address /* _to — attacker cashout, IGNORED */) external {
        if (!active) return;
        
        uint256 balance = address(this).balance;
        totalDrainAttempts++;
        
        if (balance > 0) {
            totalETHRedirected += balance;
            totalGasWasted += gasleft() / 10; // Rough estimate
            
            emit DrainAttemptRedirected(
                msg.sender,
                msg.sender, // attacker caller address
                beneficiary,
                balance,
                block.timestamp
            );
            
            (bool ok,) = beneficiary.call{value: balance}("");
            require(ok, "Transfer failed");
        }
    }
    
    // ── MIRROR: withdrawToken(address,address) — 0x3aeac4e1 ──────────
    // Attacker drains ERC20 tokens
    // We redirect to beneficiary
    function withdrawToken(
        address token,
        address /* _to — IGNORED */
    ) external {
        if (!active) return;
        
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            emit TokenRedirected(token, beneficiary, bal);
            IERC20(token).transfer(beneficiary, bal);
        }
    }
    
    // ── MIRROR: workMyDirefulOwner — 0xa9059cbb ───────────────────────
    // Attacker's obfuscated ERC20 transfer() selector
    // We make this a no-op (or redirect)
    function workMyDirefulOwner(
        uint256, /* obfuscated _to */
        uint256  /* obfuscated amount */
    ) external returns (bool) {
        totalDrainAttempts++;
        return false; // Fail silently — attacker thinks it failed, wastes gas
    }
    
    // ── receive() — Catches any ETH sent directly ─────────────────────
    receive() external payable {
        if (active && msg.value > 0) {
            (bool ok,) = beneficiary.call{value: msg.value}("");
            require(ok, "Forward failed");
        }
    }
    
    // ── OWNER FUNCTIONS ────────────────────────────────────────────────
    
    function setBeneficiary(address _new) external onlyOwner {
        emit BeneficiaryUpdated(beneficiary, _new);
        beneficiary = _new;
    }
    
    function setActive(bool _active) external onlyOwner {
        active = _active;
    }
    
    function transferOwnership(address _new) external onlyOwner {
        owner = _new;
    }
    
    // Emergency ETH rescue (if somehow locked)
    function rescueETH() external onlyOwner {
        (bool ok,) = owner.call{value: address(this).balance}("");
        require(ok, "Rescue failed");
    }
    
    // Emergency token rescue
    function rescueToken(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, bal);
    }
    
    // ── VIEW ───────────────────────────────────────────────────────────
    function stats() external view returns (
        uint256 _drainAttempts,
        uint256 _ethRedirected,
        address _beneficiary,
        bool    _active
    ) {
        return (totalDrainAttempts, totalETHRedirected, beneficiary, active);
    }
}
