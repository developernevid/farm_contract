import { Block } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { describe } from "mocha";
import { FarmContract, MintableERC20 } from "../typechain";

function getCurrentBlockInfo(): Promise<Block>  {
  return ethers.provider.getBlock(ethers.provider.getBlockNumber());
}

async function increaseAndFixTimestamp(seconds:number): Promise<any> {
  const timestamp = (await getCurrentBlockInfo()).timestamp;
  return await ethers.provider.send("evm_setNextBlockTimestamp",  [timestamp + seconds]);
} 

describe("FarmContract", function () {
  let contract: FarmContract;
  let tokenA: MintableERC20;
  let tokenB: MintableERC20;
  let governor: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  const REWARD_RATE = 200;
  const DEFAULT_SUPPLY_TOKEN_A = 50000;

  beforeEach(async () => {
    const FarmContract = await ethers.getContractFactory("FarmContract");
    const ERC20 = await ethers.getContractFactory("MintableERC20");
    [governor, alice, bob] = await ethers.getSigners();
    
    tokenA = await ERC20.deploy("tokenA", "A");
    tokenB = await ERC20.deploy("tokenB", "B");
    contract = await FarmContract.deploy(tokenA.address, tokenB.address, REWARD_RATE);

    await tokenA.mint(governor.address, 10**6);
    await tokenA.approve(contract.address, 10**6);

    await tokenB.mint(alice.address, 10**6);
    await tokenB.connect(alice).approve(contract.address, 10**6);
    await tokenB.mint(bob.address, 10**6);
    await tokenB.connect(bob).approve(contract.address, 10**6);
  });

  describe("supplyTokenA", () => {
    it("should transfer tokensA from governor to contract`s address", async function () {
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      const balance = await contract.getTokenABalance();
      expect(balance.toNumber()).to.equal(DEFAULT_SUPPLY_TOKEN_A);
    });

    it("should be called only by owner", async function () {
      await expect(
        contract.connect(bob).supplyTokenA(DEFAULT_SUPPLY_TOKEN_A)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

  });

  describe("supplyTokenB", () => {
    it("should transfer tokensB  to contract`s address", async function () {
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);

      let balance = await contract.getTokenBBalance();
      expect(balance.toNumber()).to.equal(100);
    });
    
    it("should fail if the balance for the reward is less than reward rate", async function () {
      await expect(
        contract.connect(bob).supplyTokenB(100)
      ).to.be.revertedWith("Reward is not available");
    });

    it("should fail if supply amount is zero", async function () {
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await expect(
        contract.connect(bob).supplyTokenB(0)
      ).to.be.revertedWith("supply must be more than zero");
    });

  });

  describe("harvestRewards", () => {
    it(`bob should harvest tokenA and take back all his supply depending on reward rate and staking time`, async function () {
      const stakingTimeSeconds = 25;
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);
      await increaseAndFixTimestamp(stakingTimeSeconds);
      await contract.connect(bob).harvestRewards();

      let balanceA = (await contract.getTokenABalance()).toNumber();
      expect(balanceA).to.equal(DEFAULT_SUPPLY_TOKEN_A - stakingTimeSeconds * REWARD_RATE);

      let balanceB = (await contract.getTokenBBalance()).toNumber();
      expect(balanceB).to.equal(0);
    });

    it("should give back tokenB even though there is no reward", async function () {
      const stakingTimeSeconds = DEFAULT_SUPPLY_TOKEN_A; //REWARD_RATE * stakingTimeSeconds > DEFAULT_SUPPLY_TOKEN_A
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);
      await increaseAndFixTimestamp(stakingTimeSeconds);
      await contract.connect(bob).harvestRewards();

      let balanceA = (await contract.getTokenABalance()).toNumber();
      expect(balanceA).to.equal(0);

      let balanceB = (await contract.getTokenBBalance()).toNumber();
      expect(balanceB).to.equal(0);
    });

    it(`Bob should harwest rewards in proportion to the total amount of tokenB`, async function () {
      const stakingTimeSeconds = 25;
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      const bobSupply = 100;
      await contract.connect(bob).supplyTokenB(bobSupply);
      await increaseAndFixTimestamp(stakingTimeSeconds);

      const aliceSupply = 300;
      await contract.connect(alice).supplyTokenB(aliceSupply);
      await increaseAndFixTimestamp(stakingTimeSeconds);
      
      await contract.connect(bob).harvestRewards();
      let balanceA = (await contract.getTokenABalance()).toNumber();
      
      expect(balanceA).to.equal(DEFAULT_SUPPLY_TOKEN_A - stakingTimeSeconds * 2 * REWARD_RATE * (bobSupply / (bobSupply + aliceSupply)));
    });

    it(`should reward 1 token if the share is less than one percent`, async function () {
      const stakingTimeSeconds = 25;
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      const bobSupply = 100;
      await contract.connect(bob).supplyTokenB(bobSupply);
      await increaseAndFixTimestamp(stakingTimeSeconds);

      const aliceSupply = 1000000;
      await contract.connect(alice).supplyTokenB(aliceSupply);
      await increaseAndFixTimestamp(stakingTimeSeconds);
      
      await contract.connect(bob).harvestRewards();
      let balanceA = (await contract.getTokenABalance()).toNumber();
      const expectedReward = DEFAULT_SUPPLY_TOKEN_A - stakingTimeSeconds * 2 * REWARD_RATE * (bobSupply / (bobSupply + aliceSupply));
      
      expect(balanceA).to.equal(Math.round(expectedReward));
    });
  });

  describe("debt processing", () => {
    it("it should accrue the debt if the reward is not enough", async function () {
      const stakingTimeSeconds = DEFAULT_SUPPLY_TOKEN_A; //REWARD_RATE * stakingTimeSeconds > DEFAULT_SUPPLY_TOKEN_A
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);
      await increaseAndFixTimestamp(stakingTimeSeconds);
      await contract.connect(bob).harvestRewards();

      const totalDebt = (await contract.totalDebt()).toNumber();
      const bobsDebt = (await contract.debentureTable(bob.address)).toNumber();

      expect(totalDebt).to.greaterThan(0);
      expect(bobsDebt).to.greaterThan(0);
    });

    it("should fail supplying tokenB if the debt exists", async function () {
      const stakingTimeSeconds = DEFAULT_SUPPLY_TOKEN_A; //REWARD_RATE * stakingTimeSeconds > DEFAULT_SUPPLY_TOKEN_A
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);
      await increaseAndFixTimestamp(stakingTimeSeconds);
      await contract.connect(bob).harvestRewards();
      
      await expect(contract.connect(bob).supplyTokenB(100)).to.be.reverted;
    });
  });
});
