//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FarmContract is Ownable {
    address public tokenA;
    address public tokenB;

    /* The reward is given for every second of staking. The amount of the reward depends on this attribute and 
     * the ratio between the farmer's deposit and the total amount of token B on the balance of this contract.    
     */
    uint256 public rewardAmount; 

    constructor(address _tokenA, address _tokenB, uint256 _rewardAmount) Ownable() {
        tokenA = _tokenA;
        tokenB = _tokenB;
        rewardAmount = _rewardAmount;
    }

    function supplyTokenA(uint256 _amount) public onlyOwner {
        ERC20(tokenA).transferFrom(this.owner(), address(this), _amount);
    }

    function changeReward(uint256 _newReward) public onlyOwner {
        rewardAmount = _newReward;
    }



}