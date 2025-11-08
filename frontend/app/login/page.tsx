"use client";
import { Appbar } from "@/components/Appbar";
import { CheckFeature } from "@/components/CheckFeature";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CustomWindow extends Window {
    ethereum?: any;
}

declare const window: CustomWindow;

export default function() {
    const router = useRouter();

   const connectWallet = async () => {
    if (!window.ethereum) {
      window.open('https://metamask.io/download.html', '_blank');
      return;
    }

    try {
      
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      alert("Failed to connect. Please try again.");
    }
  };

    return <div> 
        <Appbar />
        <div className="flex justify-center">
            <div className="flex pt-8 max-w-4xl">
                <div className="flex-1 pt-20 px-4">
                    <div className="font-semibold text-3xl pb-4">
                    Join millions worldwide who automate their work using Dteams.
                    </div>
                    <div className="pb-6 pt-4">
                        <CheckFeature label={"Easy setup, no coding required"} />
                    </div>
                    <div className="pb-6">
                        <CheckFeature label={"Free forever for core features"} />
                    </div>
                    <CheckFeature label={"14-day trial of premium features & apps"} />
                </div>
                <div className="flex-1 pt-6 pb-6 mt-12 px-4 border rounded flex flex-col justify-center items-center">
                    <div className="pt-4">
                        <Button onClick={connectWallet} size="lg">Connect Wallet</Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
}