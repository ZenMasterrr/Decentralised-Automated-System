'use client';

import { useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/utils';

declare global {
  interface Window {
    web3modal?: any;
    ethereum?: any;
  }
}

export function WalletButton() {
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  const handleConnect = async () => {
    try {
      if (window.web3modal) {
        await window.web3modal.openModal();
      } else {
        console.error('Web3Modal is not initialized');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
    if (window.web3modal) {
      window.web3modal.closeModal();
    }
  };

  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return <Button disabled>Loading...</Button>;
  }

  return (
    <div className="flex flex-col gap-2">
      {isConnected ? (
        <Button 
          onClick={handleDisconnect} 
          variant="outline"
          className="w-full"
        >
          Disconnect {shortenAddress(address)}
        </Button>
      ) : (
        <Button 
          onClick={handleConnect}
          className="w-full"
          variant="default"
        >
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
