"use client";
import { Appbar } from "@/components/Appbar";
import { CheckFeature } from "@/components/CheckFeature";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "../config";
import axios from "axios";

interface CustomWindow extends Window {
    ethereum?: any;
}

declare const window: CustomWindow;

export default function() {
    const router = useRouter();

    const handleSignup = async () => {
        
        localStorage.removeItem("token");

        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const address = accounts[0];
                
                const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
                    address
                });

                const token = response.data.token;
                localStorage.setItem("token", token);

                router.push("/dashboard");
            } catch (error) {
                console.error("Error during signup:", error);
                alert("Signup failed. Please try again.");
            }
        } else {
            alert("Please install MetaMask!");
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
                        <Button onClick={handleSignup} size="lg">Connect Wallet & Get Started</Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
}