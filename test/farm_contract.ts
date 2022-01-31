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
  const DEFAULT_SUPPLY_TOKEN_A = 500000;

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
    // beforeEach(async () => {
    //   await contract.deployed();
    // });

    it("should be transfered 100 tokens from governo to contract`s address", async function () {
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
    it("should be transfered 100 tokens from bob to contract`s address", async function () {
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
    it(`bob should harvest tokenA and take back all his supply depending on reward rate and staking time`,
    async function () {
      const STAKING_TIME_SECONDS = 25;
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);
      await increaseAndFixTimestamp(STAKING_TIME_SECONDS);
      await contract.connect(bob).harvestRewards();

      let balanceA = (await contract.getTokenABalance()).toNumber();
      console.log("balanceA", balanceA);
      console.log("DEFAULT_SUPPLY_TOKEN_A - STAKING_TIME_SECONDS * REWARD_RATE", DEFAULT_SUPPLY_TOKEN_A - STAKING_TIME_SECONDS * REWARD_RATE);
      expect(balanceA).to.equal(DEFAULT_SUPPLY_TOKEN_A - STAKING_TIME_SECONDS * REWARD_RATE);

      let balanceB = (await contract.getTokenBBalance()).toNumber();
      console.log("balanceB", balanceB);
      expect(balanceB).to.equal(0);
    });

    it("should give back tokenB even though there is no reward", async function () {
      const STAKING_TIME_SECONDS = DEFAULT_SUPPLY_TOKEN_A; //REWARD_RATE * STAKING_TIME_SECONDS > DEFAULT_SUPPLY_TOKEN_A
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      await contract.connect(bob).supplyTokenB(100);
      await increaseAndFixTimestamp(STAKING_TIME_SECONDS);
      await contract.connect(bob).harvestRewards();

      let balanceA = (await contract.getTokenABalance()).toNumber();
      expect(balanceA).to.equal(0); //debt == 900

      let balanceB = (await contract.getTokenBBalance()).toNumber();
      console.log("balanceB", balanceB);
      expect(balanceB).to.equal(0);
    });

    it(`Bob should harwest rewards in proportion to the total amount of tokenB`, async function () {
      const STAKING_TIME_SECONDS = 25;
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      const BOB_SUPPLY = 100;
      await contract.connect(bob).supplyTokenB(BOB_SUPPLY);
      await increaseAndFixTimestamp(STAKING_TIME_SECONDS);

      const ALICE_SUPPLY = 300;
      await contract.connect(alice).supplyTokenB(ALICE_SUPPLY);
      await increaseAndFixTimestamp(STAKING_TIME_SECONDS);
      
      await contract.connect(bob).harvestRewards();
      let balanceA = (await contract.getTokenABalance()).toNumber();
      let balanceB = (await contract.getTokenBBalance()).toNumber();
      
      console.log("balanceA === ", balanceA);
      console.log("balanceB === ", balanceB);

      console.log("200 - STAKING_TIME_SECONDS * REWARD_RATE * 1/3 === ", DEFAULT_SUPPLY_TOKEN_A - STAKING_TIME_SECONDS * 2 * REWARD_RATE * (BOB_SUPPLY / (BOB_SUPPLY + ALICE_SUPPLY)));
      
      expect(balanceA).to.equal(DEFAULT_SUPPLY_TOKEN_A - STAKING_TIME_SECONDS * 2 * REWARD_RATE * (BOB_SUPPLY / (BOB_SUPPLY + ALICE_SUPPLY)));
    });

    it(`Bob supply * 100 <  totalSupply. Test calculating of percentage with too big total supply `, async function () {
      const STAKING_TIME_SECONDS = 25;
      
      await contract.supplyTokenA(DEFAULT_SUPPLY_TOKEN_A);
      const BOB_SUPPLY = 100;
      await contract.connect(bob).supplyTokenB(BOB_SUPPLY);
      await increaseAndFixTimestamp(STAKING_TIME_SECONDS);

      const ALICE_SUPPLY = 1000000;
      await contract.connect(alice).supplyTokenB(ALICE_SUPPLY);
      await increaseAndFixTimestamp(STAKING_TIME_SECONDS);
      
      await contract.connect(bob).harvestRewards();
      let balanceA = (await contract.getTokenABalance()).toNumber();
      let balanceB = (await contract.getTokenBBalance()).toNumber();
      
      console.log("balanceA === ", balanceA);
      console.log("balanceB === ", balanceB);

      const expectedReward = DEFAULT_SUPPLY_TOKEN_A - STAKING_TIME_SECONDS * 2 * REWARD_RATE * (BOB_SUPPLY / (BOB_SUPPLY + ALICE_SUPPLY));
      
      expect(balanceA).to.equal(Math.round(expectedReward));
    });

  });

  

  // describe("transferOwnership", () => {
  //   it("call transferingOwnership", async function () {
  //     await contract.deployed();
      
  //     let result : string = await contract.owner();
  //     expect(result).to.equal(oldOwner.address);
      
  //     await contract.transferOwnership(newOwner.address);
  //     result = await contract.owner();
  //     expect(result).to.equal(newOwner.address);
  //   });

  //   it("check state", async function () {
  //     const [oldOwner,newOwner] = await ethers.getSigners();
  //     await contract.deployed();
      

  //     let result : string = await contract.owner();
  //     expect(result).to.equal(oldOwner.address);
  //   });
  // });

});
