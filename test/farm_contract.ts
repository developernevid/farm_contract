import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { describe } from "mocha";
import { FarmContract, MintableERC20 } from "../typechain";

describe("FarmContract", function () {
  let contract: FarmContract;
  let tokenA: MintableERC20;
  let tokenB: MintableERC20;
  let governor: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  const REWARD_RATE = 2;

  beforeEach(async () => {
    const FarmContract = await ethers.getContractFactory("FarmContract");
    const ERC20 = await ethers.getContractFactory("MintableERC20");
    [governor, alice, bob] = await ethers.getSigners();
    
    tokenA = await ERC20.deploy("tokenA", "A");
    tokenB = await ERC20.deploy("tokenB", "B");
    contract = await FarmContract.deploy(tokenA.address, tokenB.address, REWARD_RATE);

    await tokenA.mint(governor.address, 10**6);
    await tokenA.approve(contract.address, 10**6);

    await tokenB.mint(alice.address, 700);
    await tokenB.connect(alice).approve(contract.address, 700);
    await tokenB.mint(bob.address, 300);
    await tokenB.connect(bob).approve(contract.address, 300);
  });

  describe("supplyTokenA", () => {
    // beforeEach(async () => {
    //   await contract.deployed();
    // });

    it("should be transfered 100 tokens from governo to contract`s address", async function () {
      await contract.supplyTokenA(100);
      const balance = await contract.getTokenABalance();
      expect(balance.toNumber()).to.equal(100);
    });

    it("should be called only by owner", async function () {
      await expect(
        contract.connect(bob).supplyTokenA(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

  });

  describe("supplyTokenB", () => {
    it("should be transfered 100 tokens from bob to contract`s address", async function () {
      await contract.supplyTokenA(100);
      await contract.connect(bob).supplyTokenB(100);

      let balance = await contract.getTokenBBalance();
      expect(balance.toNumber()).to.equal(100);
      const supplyAmount = (await contract.supplyList(bob.address)).supplyAmount.toNumber();    
      expect(supplyAmount).to.equal(100);
    });
    
    it("should fails if the balance for the reward is less than reward rate", async function () {
      await expect(
        contract.connect(bob).supplyTokenB(100)
      ).to.be.revertedWith("Reward is not available");
    });

    it("should fails if supply amount is zero", async function () {
      await contract.supplyTokenA(100);
      await expect(
        contract.connect(bob).supplyTokenB(0)
      ).to.be.revertedWith("supply must be more than zero");
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
