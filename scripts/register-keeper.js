const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log(" Registering as Keeper...\n");

  const contractAddress = process.env.ZAP_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error(" ZAP_CONTRACT_ADDRESS not set in .env");
    process.exit(1);
  }

  
  const [keeper] = await hre.ethers.getSigners();
  console.log("📍 Keeper address:", keeper.address);
  
  const balance = await hre.ethers.provider.getBalance(keeper.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.15")) {
    console.error(" Insufficient balance! Need at least 0.15 ETH (0.1 stake + 0.05 gas).");
    process.exit(1);
  }

 
  const ZapV2 = await hre.ethers.getContractFactory("ZapV2");
  const zapV2 = ZapV2.attach(contractAddress);

  
  const isAlreadyKeeper = await zapV2.isKeeper(keeper.address);
  if (isAlreadyKeeper) {
    console.log("✅ Already registered as keeper!");
    
    const keeperInfo = await zapV2.keepers(keeper.address);
    console.log("\n Keeper Stats:");
    console.log("   Stake:", hre.ethers.formatEther(keeperInfo.stake), "ETH");
    console.log("   Executions:", keeperInfo.executionCount.toString());
    console.log("   Total Rewards:", hre.ethers.formatEther(keeperInfo.totalRewardsEarned), "ETH");
    console.log("   Active:", keeperInfo.active);
    
    process.exit(0);
  }

  
  const minStake = await zapV2.minKeeperStake();
  console.log(" Registering with stake:", hre.ethers.formatEther(minStake), "ETH...");

  const tx = await zapV2.registerKeeper({ value: minStake });
  console.log(" Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log(" Registered successfully!");
  console.log(" Gas used:", receipt.gasUsed.toString());

  // Verify registration
  const isKeeper = await zapV2.isKeeper(keeper.address);
  console.log("\n Keeper registration confirmed:", isKeeper);

  const keeperInfo = await zapV2.keepers(keeper.address);
  console.log("\n Keeper Stats:");
  console.log("   Stake:", hre.ethers.formatEther(keeperInfo.stake), "ETH");
  console.log("   Executions:", keeperInfo.executionCount.toString());
  console.log("   Total Rewards:", hre.ethers.formatEther(keeperInfo.totalRewardsEarned), "ETH");
  console.log("   Active:", keeperInfo.active);

  console.log("\n You are now a registered keeper!");
  console.log(" Next steps:");
  console.log("1. Start keeper service:");
  console.log(`   cd keeper && npx ts-node src/keeper-v2.ts`);
  console.log("2. Monitor for zap executions");
  console.log("3. Earn rewards!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
