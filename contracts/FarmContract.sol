//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract FarmContract is Ownable {
    struct SupplyInfo {
        uint timestamp;
        uint256 supplyAmount;
        uint256 rewardRate;
    }

    uint constant PRESSION = 1;

    uint256 public totalDebenture;
    uint public rewardRate; 
    address public tokenA;
    address public tokenB;

    mapping(address => SupplyInfo[]) public supplyList;
    /* The reward is given for every second of staking. The amount of the reward depends on this attribute and 
     * the ratio between the farmer's deposit and the total amount of token B on the balance of this contract.    
     */

    mapping(address => uint256) public debentureTable;
    address[] public lenders;

    constructor(address _tokenA, address _tokenB, uint256 _rewardRate) Ownable() {
        tokenA = _tokenA;
        tokenB = _tokenB;
        rewardRate = _rewardRate;
    }

    function supplyTokenA(uint256 _amount) public onlyOwner {
        IERC20(tokenA).transferFrom(this.owner(), address(this), _amount);
        if (totalDebenture > 0 ) payOffAllDebts();
    }

    function payOffAllDebts() internal {
        for (uint i = 0; i < lenders.length; i++) {
            if (getTokenABalance() < debentureTable[lenders[i]]){
                break;
            }
            totalDebenture -= debentureTable[lenders[i]];

            IERC20(tokenA).transfer(lenders[i], debentureTable[lenders[i]]);
            removeDebenture(i);
        }
    }

    function removeDebenture(uint _index) private {
            delete debentureTable[lenders[_index]];

            //delete lender[i] without preserving order
            lenders[_index] = lenders[lenders.length - 1];
            lenders.pop();
    }

    function changeReward(uint256 _newReward) public onlyOwner {
        rewardRate = _newReward;
    }

    function supplyTokenB(uint256 _amount) public {
        require(getTokenABalance() >= rewardRate, "Reward is not available");
        require(totalDebenture == 0, "Wait until the debt is paid off");
        require(_amount > 0, "supply must be more than zero");

        IERC20(tokenB).transferFrom(msg.sender, address(this), _amount);
        addSupplyInfo(msg.sender, _amount);
    }

    function harvestRewards() public {
        harvestRewardsInternal(msg.sender);
    }

    function harvestRewardsInternal(address _account) internal {
        if(supplyList[_account].length == 0) return;

        (uint totalStakingTime, uint256 supplyAverage, uint256 rewardRateAverage) = accumulateSupplyInfo(_account);
        console.log("[solidity] totalStakingTime", totalStakingTime);
        console.log("[solidity] supplyAverage", supplyAverage);
        console.log("[solidity] rewardRateAverage", rewardRateAverage);

        uint256 rewardAmount = totalStakingTime * rewardRateAverage * shareOfReward(supplyAverage) / (100 * PRESSION);
        console.log("[solidity] rewardAmount", rewardAmount);

        uint256 tokenABalance = getTokenABalance();
        if (tokenABalance < rewardAmount) {
            console.log("[solidity] tokenABalance < rewardAmount", rewardAmount);
            uint256 debt = rewardAmount - tokenABalance;
            totalDebenture += debt;
            debentureTable[_account] = debt;
            lenders.push(_account);
            IERC20(tokenA).transfer(_account, tokenABalance);
        } else {
            IERC20(tokenA).transfer(_account, rewardAmount);
        }

        IERC20(tokenB).transfer(_account, supplyAverage); 
        delete supplyList[_account]; // write default value of struct (https://docs.soliditylang.org/en/v0.8.11/types.html?highlight=delete#delete)
    }

    function getTokenABalance() public view returns (uint256) {
        return IERC20(tokenA).balanceOf(address(this));
    }

    function accumulateSupplyInfo(address _account) private view returns(uint /*totalStakingTime*/, uint256/*supplyAverage*/, uint256/*rewardRateAverage*/){
        uint totalStakingTime = 0;
        uint256 totalSupply = 0;
        uint256 totalRewardRate = 0;
        for (uint256 i = 0; i < supplyList[_account].length; i++) {
            totalStakingTime += block.timestamp - supplyList[_account][i].timestamp;
            totalSupply += supplyList[_account][i].supplyAmount;
            totalRewardRate += supplyList[_account][i].rewardRate;
        }

        return (totalStakingTime, totalSupply / supplyList[_account].length, totalRewardRate / supplyList[_account].length);
    }

    function getTokenBBalance() public view returns (uint256) {
        return IERC20(tokenB).balanceOf(address(this));
    }

    function shareOfReward(uint256 _supplyAmount) private view returns(uint256) {
        uint256 tokenBBalance = getTokenBBalance();
        console.log("[solidity] tokenBBalance", tokenBBalance);
        console.log("[solidity] supplyList[_account].supplyAmount", _supplyAmount);
        (bool divByZero, uint256 result) = calculatePercentage(tokenBBalance, _supplyAmount, PRESSION);

        console.log("[solidity] result", result);
        return result;
    }

    function addSupplyInfo(address _account, uint256 _supplyAmount) private {
        supplyList[_account].push(SupplyInfo(block.timestamp, _supplyAmount, rewardRate));
    }

    function calculatePercentage(uint256 _totalAmount, uint256 _amount, uint256 _precision) private pure returns(bool, uint256) {
        return SafeMath.tryDiv(_amount * 100 * _precision, _totalAmount);
    }
}