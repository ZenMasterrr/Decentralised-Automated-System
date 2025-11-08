"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

interface CustomWindow extends Window {
    ethereum?: any;
}

declare const window: CustomWindow;

export const Appbar = () => {
    const router = useRouter();
    const [userAddress, setUserAddress] = useState<string | null>(null);

    
    useEffect(() => {
        const checkSession = async () => {
            if (window.ethereum) {
                const token = localStorage.getItem("token");
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });

                if (token && accounts.length > 0) {
                    setUserAddress(accounts[0]);
                } else {
                    // If there's no token or no connected accounts, ensure user is logged out
                    handleLogout(false); 
                }
            }
        };

        checkSession();

        
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                
                handleLogout();
            } else {
                
                setUserAddress(accounts[0]);
                
                localStorage.removeItem("token");
                router.push('/signup'); 
            }
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
        }

        
        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, [router]);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setUserAddress(accounts[0]);
                
                router.push('/signup');
            } catch (error) {
                console.error("Error connecting to MetaMask", error);
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const handleLogout = (redirect = true) => {
        localStorage.removeItem("token");
        setUserAddress(null);
        if (redirect) {
            router.push("/signup");
        }
    };

    return (
        <div className="flex border-b justify-between p-4">
            <div className="flex flex-col justify-center text-2xl font-extrabold">
                Dteams
            </div>
            <div className="flex items-center">
                {userAddress ? (
                    <div className="flex items-center">
                        <span className="mr-4 text-sm">{`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}</span>
                        <Button onClick={() => handleLogout()}>Logout</Button>
                    </div>
                ) : (
                    <Button onClick={connectWallet}>Connect Wallet</Button>
                )}
            </div>
        </div>
    );
};