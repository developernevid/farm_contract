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

  beforeEach(async () => {
    const FarmContract = await ethers.getContractFactory("FarmContract");
    const ERC20 = await ethers.getContractFactory("MintableERC20");
    [governor, alice, bob] = await ethers.getSigners();
    // console.log("governor ", governor.address);
    // console.log("alice ", alice.address);
    // console.log("bob ", bob.address);
    
    tokenA = await ERC20.deploy("tokenA", "A");
    tokenB = await ERC20.deploy("tokenB", "B");
    contract = await FarmContract.deploy(tokenA.address, tokenB.address, 2);

    tokenA.mint(governor.address, 10**6);
    tokenA.approve(contract.address, 10**6);


    tokenB.mint(alice.address, 700);
    tokenB.connect(alice).approve(contract.address, 700);
    tokenB.mint(bob.address, 300);
    tokenB.connect(bob).approve(contract.address, 300);

  });

  describe("supplyTokenA", () => {
    it("should transfer 100 tokens from governo to contract`s address", async function () {
      await contract.deployed();

      contract.supplyTokenA(100);
      const balance = await contract.getTokenABalance();
      console.log(balance.toString());
      // expect(balance).to.equal(100);
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
