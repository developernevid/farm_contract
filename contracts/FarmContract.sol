//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FarmContract is Ownable {
    struct SupplyInfo {
        uint timestamp;
        uint256 supplyAmount;
        uint256 rewardRate;
        uint256 share;          // percentage
    }

    uint256 public totalDebenture;
    uint public rewardRate; 
    address public tokenA;
    address public tokenB;

    mapping(address => SupplyInfo) public supplyList;
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
        ERC20(tokenA).transferFrom(this.owner(), address(this), _amount);
    }

    function payOffDebts() internal {
        for (uint i = 0; i < lenders.length; i++) {
            if (getTokenABalance() < debentureTable[lenders[i]]){
                break;
            }
            totalDebenture -= debentureTable[lenders[i]];

            ERC20(tokenA).transfer(lenders[i], debentureTable[lenders[i]]);
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

        ERC20(tokenA).transferFrom(msg.sender, address(this), _amount);

        harvestRewardsInternal(msg.sender);
        supplyList[msg.sender] = SupplyInfo(block.timestamp, _amount, rewardRate, shareOfReward(_amount));
    }

    function harvestRewards() public {
        harvestRewardsInternal(msg.sender);
    }

    function harvestRewardsInternal(address _account) internal {
        if (supplyList[_account].timestamp == 0) return;

        uint stakingTime = block.timestamp - supplyList[_account].timestamp;
        uint256 rewardAmount = stakingTime * supplyList[_account].rewardRate * supplyList[_account].share;
        uint256 tokenABalance = getTokenABalance();
        if (tokenABalance < rewardAmount) {
            uint256 debt = rewardAmount - tokenABalance;
            totalDebenture += debt;
            debentureTable[_account] += debt;
            ERC20(tokenA).transfer(_account, tokenABalance);
        } else {
            ERC20(tokenA).transfer(_account, rewardAmount);
        }

        delete supplyList[_account]; // write default value of struct (https://docs.soliditylang.org/en/v0.8.11/types.html?highlight=delete#delete)
    }

    function getTokenABalance() public view returns (uint256) {
        return ERC20(tokenA).balanceOf(address(this));
    }

    function shareOfReward(uint256 _amount) internal view returns(uint256) {
        return _amount / getTokenABalance();
    }

}