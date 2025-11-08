'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Link from 'next/link';

const ZAP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ZAP_CONTRACT_ADDRESS || '';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';


const ZAP_ABI = [
  "function mintZap(tuple(uint256 triggerType, address source, bytes data) trigger, tuple(uint256 actionType, address target, uint256 value, bytes data)[] actions, string metadataURI) returns (uint256)",
  "function getTotalZaps() view returns (uint256)"
];

export default function CreateZapWeb3() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [zapId, setZapId] = useState<string | null>(null);
  
  // Zap configuration
  const [triggerType, setTriggerType] = useState('gmail');
  const [triggerValue, setTriggerValue] = useState('');
  const [actionType, setActionType] = useState('email');
  const [actionValue, setActionValue] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          setConnected(true);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }

  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      setStatus(' Please install MetaMask!');
      window.open('https://metamask.io/', '_blank');
      return;
    }

    setLoading(true);
    setStatus('Connecting to MetaMask...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      
      const network = await provider.getNetwork();
      if (network.name !== NETWORK && Number(network.chainId) !== 11155111) { // Sepolia chainId
        setStatus(' Please switch to Sepolia network in MetaMask');
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], 
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/8f127c2c0d3e48b2a32ae0b74d3de077'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          }
        }
      }

      setAccount(address);
      setConnected(true);
      setStatus(` Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error: any) {
      setStatus(` Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createZap() {
    if (!connected) {
      setStatus(' Please connect wallet first');
      return;
    }

    if (!triggerValue || !actionValue) {
      setStatus(' Please fill all fields');
      return;
    }

    if (!ZAP_CONTRACT_ADDRESS) {
      setStatus(' Contract address not configured. Please deploy contract first.');
      return;
    }

    setLoading(true);
    setStatus('Creating zap on blockchain...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Connect to contract
      const zapContract = new ethers.Contract(ZAP_CONTRACT_ADDRESS, ZAP_ABI, signer);

      setStatus('Preparing transaction...');

      // Prepare trigger data 
      const triggerConfig = {
        type: triggerType,
        value: triggerValue
      };
      const triggerData = ethers.toUtf8Bytes(JSON.stringify(triggerConfig));

      const trigger = {
        triggerType: 1, 
        source: ethers.ZeroAddress,
        data: triggerData
      };

      // Prepare action data
      const actionConfig = {
        type: actionType,
        value: actionValue
      };
      const actionData = ethers.toUtf8Bytes(JSON.stringify(actionConfig));

      const actions = [
        {
          actionType: 1, 
          target: ethers.ZeroAddress,
          value: 0,
          data: actionData
        }
      ];

      // Metadata URI 
      const metadata = {
        name: `Zap: ${triggerType} to ${actionType}`,
        description: `When ${triggerType} ${triggerValue}, then ${actionType} ${actionValue}`,
        created: new Date().toISOString()
      };
      
      const metadataJson = JSON.stringify(metadata);
      const metadataBase64 = btoa(unescape(encodeURIComponent(metadataJson)));
      const metadataURI = `data:application/json;base64,${metadataBase64}`;

      setStatus('Please confirm transaction in MetaMask...');

      //gas
      let gasLimit = 300000; 
      try {
        const gasEstimate = await zapContract.mintZap.estimateGas(trigger, actions, metadataURI);
        gasLimit = Number(gasEstimate) + 50000; 
        console.log('Gas estimate:', gasEstimate.toString(), 'Using:', gasLimit);
        
        // Calculate cost
        const feeData = await provider.getFeeData();
        const gasCostWei = BigInt(gasLimit) * (feeData.gasPrice || 0n);
        const gasCostEth = ethers.formatEther(gasCostWei);
        
        setStatus(`Estimated cost: ${gasCostEth} ETH. Please confirm in MetaMask...`);
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError);
        setStatus('⚠️ Using default gas limit. Please confirm in MetaMask...');
      }

      
      const tx = await zapContract.mintZap(trigger, actions, metadataURI, {
        gasLimit: gasLimit
      });
      
      setStatus(`Transaction sent: ${tx.hash}`);
      setStatus('Waiting for confirmation...');

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        
        const totalZaps = await zapContract.getTotalZaps();
        const newZapId = (totalZaps - 1n).toString();
        
        setZapId(newZapId);
        setStatus(` Zap created successfully! NFT ID: ${newZapId}`);
        
        
        await registerWithBackend(newZapId, trigger, actions);
        
        
        setTimeout(() => {
          router.push('/dashboard?zap_created=true&zap_id=' + newZapId);
        }, 3000);
      } else {
        setStatus(' Transaction failed');
      }

    } catch (error: any) {
      console.error('Error creating zap:', error);
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        setStatus(' Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(account);
        const balanceEth = ethers.formatEther(balance);
        setStatus(` Insufficient funds. You have ${balanceEth} ETH. Gas cost may exceed balance.`);
      } else if (error.reason) {
        setStatus(` Contract error: ${error.reason}`);
      } else if (error.message) {
        setStatus(` Error: ${error.message}`);
      } else {
        setStatus(` Unknown error. Check console for details.`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function registerWithBackend(zapId: string, trigger: any, actions: any[]) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
      await fetch(`${backendUrl}/api/v1/zap/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: zapId,
          trigger,
          actions,
          status: 'active',
          blockchain: true
        })
      });
      console.log(' Registered with backend');
    } catch (error) {
      console.warn(' Could not register with backend:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <button className="text-blue-600 hover:text-blue-800 mb-4 font-medium">
              ← Back to Dashboard
            </button>
          </Link>
          
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            Create Decentralized Zap
          </h1>
          <p className="text-gray-600">
            Create your zap as an NFT on Sepolia testnet - managed by decentralized keeper network
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">1. Connect Wallet</h2>
          
          {!connected ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Connect your MetaMask wallet to create decentralized zaps on the blockchain.
              </p>
              <button
                onClick={connectWallet}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="bg-green-100 p-2 rounded-full">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">Wallet Connected</p>
                <p className="text-sm text-green-700">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Zap Configuration */}
        {connected && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">2. Configure Trigger</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Trigger Type</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="gmail">Gmail - When I receive an email</option>
                    <option value="price">Price Alert - Crypto price change</option>
                    <option value="webhook">Webhook - Custom HTTP trigger</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {triggerType === 'gmail' && 'Email Subject Contains'}
                    {triggerType === 'price' && 'Token Symbol'}
                    {triggerType === 'webhook' && 'Webhook URL'}
                  </label>
                  <input
                    type="text"
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder={triggerType === 'gmail' ? 'e.g., invoice, meeting' : triggerType === 'price' ? 'e.g., BTC, ETH' : 'https://example.com/webhook'}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">3. Configure Action</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Action Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="email">Send Email</option>
                    <option value="sheets">Update Google Sheets</option>
                    <option value="webhook">Call Webhook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {actionType === 'email' && 'Recipient Email'}
                    {actionType === 'sheets' && 'Spreadsheet ID'}
                    {actionType === 'webhook' && 'Webhook URL'}
                  </label>
                  <input
                    type="text"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder={actionType === 'email' ? 'recipient@example.com' : actionType === 'sheets' ? 'Enter spreadsheet ID' : 'https://example.com/action'}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">4. Create Zap</h2>
              
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong> Blockchain Transaction:</strong> This will mint your zap as an NFT on Sepolia testnet. You'll need to approve the transaction in MetaMask.
                </p>
              </div>

              <button
                onClick={createZap}
                disabled={loading || !triggerValue || !actionValue}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Creating on Blockchain...' : 'Create Zap'}
              </button>

              {status && (
                <div className={`mt-4 p-4 rounded-md border ${
                  status.includes('✅') || status.includes('Success') 
                    ? 'bg-green-50 border-green-200' 
                    : status.includes('❌') || status.includes('Error')
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-sm">{status}</p>
                </div>
              )}

              {zapId && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-semibold text-green-800 mb-2">🎉 Zap Created Successfully!</p>
                  <p className="text-sm text-green-700 mb-3">
                    Your zap has been minted as NFT #{zapId} on the blockchain
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={`https://sepolia.etherscan.io/address/${ZAP_CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View on Etherscan →
                    </a>
                    <Link href="/dashboard" className="text-green-600 hover:text-green-800 text-sm font-medium">
                      Go to Dashboard →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-md">
          <h4 className="font-semibold text-blue-900 mb-3">ℹ️ About Decentralized Zaps</h4>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>• <strong>NFT Ownership:</strong> Your zap is minted as an NFT that you own on the blockchain</li>
            <li>• <strong>Gas Fees:</strong> ~$0.10-0.50 for minting (Sepolia testnet is free with test ETH)</li>
            <li>• <strong>Automated Execution:</strong> Keeper network monitors and executes your zaps automatically</li>
            <li>• <strong>Transparency:</strong> All zaps and executions are visible on blockchain</li>
            <li>• <strong>Censorship Resistant:</strong> Cannot be blocked or taken down by any central authority</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
