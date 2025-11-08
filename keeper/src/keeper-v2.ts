import { ethers } from "ethers";
import * as dotenv from "dotenv";
import axios from "axios";


dotenv.config();


const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL!;
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY!;
const ZAP_CONTRACT_ADDRESS = process.env.ZAP_CONTRACT_ADDRESS!;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";


if (!SEPOLIA_RPC_URL || !KEEPER_PRIVATE_KEY || !ZAP_CONTRACT_ADDRESS) {
  console.error(" Missing required environment variables!");
  console.error("Required: SEPOLIA_RPC_URL, KEEPER_PRIVATE_KEY, ZAP_CONTRACT_ADDRESS");
  process.exit(1);
}


const ZAP_ABI = [
  "function getTotalZaps() view returns (uint256)",
  "function getZap(uint256) view returns (address owner, uint256 triggerType, bool active, uint256 executionCount, uint256 actionCount)",
  "function zaps(uint256) view returns (address owner, uint256 triggerType, bytes data, bool active, uint256 executionCount, uint256 lastExecuted)",
  "function execute(uint256 zapId) payable",
  "function isKeeper(address) view returns (bool)",
  "function executionReward() view returns (uint256)",
  "event ZapMinted(uint256 indexed zapId, address indexed owner, uint256 triggerType)",
  "event ZapExecuted(uint256 indexed zapId, address indexed executor, bool isKeeper, uint256 reward)"
];


const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);


const zapContract = new ethers.Contract(ZAP_CONTRACT_ADDRESS, ZAP_ABI, wallet);


class KeeperService {
  private processedEmails = new Set<string>();
  private monitoringInterval: NodeJS.Timeout | null = null;

  
  async start() {
    console.log("\n Keeper Service Starting...\n");
    console.log("=" .repeat(50));
    console.log(" Keeper Address:", wallet.address);
    console.log(" Contract Address:", ZAP_CONTRACT_ADDRESS);
    console.log(" Network: Sepolia Testnet");
    console.log("=" .repeat(50));

    try {
      
      const isRegistered = await zapContract.isKeeper(wallet.address);
      
      if (!isRegistered) {
        console.error("\n❌ NOT REGISTERED AS KEEPER!");
        console.error("Please register first using:");
        console.error("npx hardhat run scripts/register-keeper.js --network sepolia\n");
        process.exit(1);
      }

      console.log("✅ Keeper registered\n");

      
      const balance = await provider.getBalance(wallet.address);
      console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

      if (balance < ethers.parseEther("0.01")) {
        console.warn("\n⚠️  Low balance! Consider adding more ETH.\n");
      }

      
      const reward = await zapContract.executionReward();
      console.log("🎁 Execution Reward:", ethers.formatEther(reward), "ETH\n");

      
      await this.monitorZaps();

      
      this.monitoringInterval = setInterval(() => {
        this.monitorZaps();
      }, 60000);

      
      zapContract.on("ZapMinted", (zapId, owner, triggerType) => {
        console.log(`\n📝 New Zap Minted!`);
        console.log(`   Zap ID: #${zapId}`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Trigger Type: ${triggerType === 0n ? "On-chain" : "Off-chain"}\n`);
      });

      
      zapContract.on("ZapExecuted", (zapId, executor, isKeeper, reward) => {
        if (executor.toLowerCase() === wallet.address.toLowerCase()) {
          console.log(`\n🎉 Successfully executed Zap #${zapId}!`);
          console.log(`   Reward: ${ethers.formatEther(reward)} ETH\n`);
        }
      });

      console.log("✅ Keeper service is running...");
      console.log("⏰ Monitoring every 60 seconds\n");
      console.log("Press Ctrl+C to stop\n");

    } catch (error: any) {
      console.error("\n❌ Failed to start keeper service:");
      console.error(error.message);
      process.exit(1);
    }
  }

  
  async monitorZaps() {
    try {
      const now = new Date().toISOString();
      console.log(`[${now}]  Monitoring zaps...`);

      
      const totalZaps = await zapContract.getTotalZaps();
      console.log(` Total zaps on contract: ${totalZaps}`);

      if (totalZaps === 0n) {
        console.log(" No zaps to monitor. Waiting for zaps to be created...\n");
        return;
      }

      
      let activeZaps = 0;
      for (let i = 0; i < Number(totalZaps); i++) {
        const zapActive = await this.checkZap(i);
        if (zapActive) activeZaps++;
      }

      console.log(` Monitored ${activeZaps} active zaps\n`);

    } catch (error: any) {
      console.error(" Error monitoring zaps:", error.message);
    }
  }

  
  async checkZap(zapId: number): Promise<boolean> {
    try {
      
      const [owner, triggerType, active, executionCount, actionCount] = 
        await zapContract.getZap(zapId);

      if (!active) {
        return false;
      }

      
      if (triggerType === 1n) {
        console.log(`  Zap #${zapId}: Off-chain trigger (${executionCount} executions)`);
        
        
        const hasNewTrigger = await this.checkOffChainTrigger(zapId);
        
        if (hasNewTrigger) {
          await this.executeZap(zapId);
        }
      } else {
        
        console.log(`  Zap #${zapId}: On-chain trigger (skipping for now)`);
      }

      return true;

    } catch (error: any) {
      
      return false;
    }
  }

  
  async checkOffChainTrigger(zapId: number): Promise<boolean> {
    try {
      
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/keeper/check-trigger/${zapId}`,
        { timeout: 5000 }
      );

      return response.data.shouldExecute || false;

    } catch (error: any) {
      
      if (error.code !== "ECONNREFUSED") {
        console.log(`  ⚠️  Could not check trigger for Zap #${zapId}`);
      }
      return false;
    }
  }

  
  async executeZap(zapId: number) {
    try {
      console.log(`\n Executing Zap #${zapId} on blockchain...`);

      
      const gasEstimate = await zapContract.execute.estimateGas(zapId);
      console.log(`   Estimated gas: ${gasEstimate.toString()}`);

      
      const tx = await zapContract.execute(zapId, {
        gasLimit: gasEstimate * 120n / 100n 
      });

      console.log(`   Transaction sent: ${tx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(` Zap #${zapId} executed successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);
      } else {
        console.log(` Zap #${zapId} execution failed`);
      }

    } catch (error: any) {
      console.error(`\n Failed to execute Zap #${zapId}:`);
      
      if (error.code === "INSUFFICIENT_FUNDS") {
        console.error("   Insufficient ETH balance");
      } else if (error.message.includes("revert")) {
        console.error("   Transaction reverted:", error.message);
      } else {
        console.error("   Error:", error.message);
      }
    }
  }

  
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log("\n Keeper service stopped\n");
  }
}


async function main() {
  const keeper = new KeeperService();

  
  process.on("SIGINT", () => {
    console.log("\n\n Shutting down keeper service...");
    keeper.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n Shutting down keeper service...");
    keeper.stop();
    process.exit(0);
  });

  
  await keeper.start();
}


main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
