"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { toast } from 'sonner';
import { Appbar } from '@/components/Appbar';
import EmailActionForm from '@/components/EmailActionForm';
import WebhookTrigger from '@/components/WebhookTrigger';
import WebhookActionForm from '@/components/WebhookActionForm';
import { GoogleWorkflowConfig } from '@/components/GoogleWorkflowConfig';
import Zap from '@/abi/Zap.json';

export interface TriggerData {
  type: 'price_above' | 'price_below' | 'webhook';
  chain: string;
  token: string;
  price?: number;
  webhookUrl?: string;
  webhookId?: string;
}

export interface EmailActionData {
  type: 'email';
  to: string;
  subject: string;
  body: string;
}

export interface WebhookActionData {
  type: 'webhook';
  url: string;
  payload?: Record<string, any>;
}

export type ActionData = EmailActionData | WebhookActionData;

interface CustomWindow extends Window {
  ethereum?: any;
}

declare const window: CustomWindow;

const ZAP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ZAP_CONTRACT_ADDRESS || "";
const ZAP_ORACLE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS || "";


const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return null;
};

const getSigner = async () => {
  const provider = getProvider();
  if (!provider) return null;
  return await provider.getSigner();
};

type TriggerType = 'price' | 'webhook' | 'google' | null;

export default function CreateZap() {
  const router = useRouter();
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>('google');
  const [triggerData, setTriggerData] = useState<TriggerData | null>(null);
  const [googleWorkflow, setGoogleWorkflow] = useState<any>(null);
  const [actions, setActions] = useState<ActionData[]>([]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTrigger = (trigger: { type: 'webhook' | 'price_above' | 'price_below'; webhookId?: string } & Partial<TriggerData>) => {
    console.log('New trigger added:', trigger);
    const newTrigger: TriggerData = {
      type: trigger.type,
      chain: trigger.chain || 'ethereum',
      token: trigger.token || 'WETH',
      webhookId: trigger.webhookId || '',
      price: trigger.price,
      webhookUrl: trigger.webhookUrl
    };
    setTriggerData(newTrigger);
    
    setSelectedTrigger(null);
  };

  const handleAddAction = (action: ActionData) => {
    console.log('New action added:', JSON.stringify(action, null, 2));
    setActions([...actions, action]);
    setShowEmailForm(false);
  };

  const handleTriggerSelect = (triggerType: TriggerType) => {
    console.log('Trigger selected:', triggerType);
    setSelectedTrigger(triggerType);
    setTriggerData(null);
  };

  const handleCreateZap = async () => {
   
    if (!triggerData && !googleWorkflow) {
      console.error('Please set up your trigger first.'); 
      toast.error('Please configure a trigger first');
      return;
    }
    
    
    if (!googleWorkflow && actions.length === 0) {
      console.error('Please add at least one action.'); 
      toast.error('Please add at least one action');
      return;
    }
    
    
    if (googleWorkflow && (!googleWorkflow.steps || googleWorkflow.steps.length === 0)) {
      console.error('Please configure at least one workflow step.'); 
      toast.error('Please configure at least one workflow step');
      return;
    }
    
    setIsLoading(true);
    
    try {
      
      if (googleWorkflow) {
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }

        const backendData = {
          trigger: {
            id: 'google_workflow',
            config: {
              type: 'google_workflow',
              workflow: googleWorkflow
            }
          },
          actions: googleWorkflow.steps.filter((step: any) => step.type !== 'trigger').map((step: any) => ({
            id: step.type,
            type: step.type,
            config: step.config
          })),
          status: 'pending'
        };

        console.log('Creating Google Workflow Zap:', JSON.stringify(backendData, null, 2));

        
        const zapId = `zap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const zapName = googleWorkflow.name || `Google Workflow: ${googleWorkflow.steps.map((s: any) => s.title).join(' → ')}`;
        
       
        const testUrl = `/api/test-zap/${zapId}`;
        
        
        const newZap = {
          id: zapId,
          name: zapName,
          status: 'active',
          trigger: {
            type: 'google_workflow',
            workflow: googleWorkflow
          },
          actions: googleWorkflow.steps.filter((step: any) => step.type !== 'trigger').map((step: any) => ({
            type: step.type,
            config: step.config
          })),
          testUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        
        try {
          const savedZaps = JSON.parse(localStorage.getItem('mockZaps') || '{}');
          savedZaps[zapId] = newZap;
          localStorage.setItem('mockZaps', JSON.stringify(savedZaps));
          window.dispatchEvent(new Event('storage'));
          console.log('Saved Google Workflow zap to localStorage:', JSON.stringify(newZap, null, 2));
          
          
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
          try {
            await fetch(`${backendUrl}/api/v1/zap/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: zapId,
                trigger: newZap.trigger,
                actions: newZap.actions,
                status: 'active'
              })
            });
            console.log(' Auto-registered zap for monitoring:', zapId);
          } catch (regError) {
            console.warn(' Could not auto-register zap (backend may be offline):', regError);
          }
        } catch (error) {
          console.error('Failed to save zap to localStorage:', error);
        }
        
       
        const response = await fetch('/api/zaps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backendData)
        });
        
        const responseText = await response.text();
        let result;
        
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error('Failed to parse backend response:', e);
          throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`);
        }
        
        if (!response.ok) {
          console.error('Backend error:', result);
          console.log('Zap saved to localStorage, but backend save failed. Continuing...');
          return { ...newZap, id: zapId };
        }
        
        console.log('Google Workflow Zap saved to backend:', JSON.stringify(result, null, 2));
        console.log('Google Workflow Zap created successfully!');
        
        
        if (result?.id) {
          setTimeout(() => {
            localStorage.setItem('newZapId', result.id);
          }, 100);
        }
        
       
        router.push('/dashboard?zap_created=true');
        return;
      }
      
      
      if (!triggerData) {
        throw new Error('Trigger data is required for regular zaps');
      }
      
      
      const zap = {
        trigger: {
          type: triggerData.type,
          chain: triggerData.chain || 'ethereum',
          token: triggerData.token || 'WETH',
          price: triggerData.price,
          webhookUrl: triggerData.webhookUrl,
          webhookId: triggerData.webhookId
        },
        actions: [...actions] 
      };

      console.log('Creating Zap:', JSON.stringify(zap, null, 2));

      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask to create Zaps!');
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const zapContract = new Contract(
        ZAP_CONTRACT_ADDRESS,
        Zap.abi,
        signer
      );
      
      
      const priceInWei = zap.trigger.price 
        ? ethers.parseEther(zap.trigger.price.toString()) 
        : BigInt(0);
      
      
      const trigger = {
        triggerType: 1, 
        source: ethers.ZeroAddress, 
        data: ethers.toUtf8Bytes(zap.trigger.webhookUrl || "")
      };

      
      const actionStructs = await Promise.all(zap.actions.map(async (action) => {
        let actionData = '0x';
        if (action.type === 'email') {
          actionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['string[]'],
            [[action.to, action.subject, action.body]]
          );
        } else if (action.type === 'webhook') {
          actionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['string', 'string'],
            [action.url, JSON.stringify(action.payload || {})]
          );
        }

        return {
          actionType: 1,
          target: ZAP_ORACLE_CONTRACT_ADDRESS,
          value: 0,
          data: actionData
        };
      }));

      
      const transactionData = {
        trigger: {
          triggerType: trigger.triggerType,
          source: trigger.source,
          data: '0x' + Array.from(trigger.data).map(b => b.toString(16).padStart(2, '0')).join('')
        },
        actions: actionStructs.map(action => ({
          actionType: action.actionType,
          target: action.target,
          value: action.value.toString(),
          data: action.data
        })),
        gasLimit: '2000000'
      };
      console.log('Sending transaction with:', JSON.stringify(transactionData, null, 2));
      const tx = await zapContract.mintZap(trigger, actionStructs, { gasLimit: 2_000_000 });

      console.log('Transaction sent, waiting for confirmation...');
      console.log('Transaction hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Zap created successfully!', {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      });
      
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      
      const backendData = {
        trigger: {
          id: triggerData.type === 'webhook' ? 'webhook' : 'price_alert',
          config: {
            ...triggerData,
            
            price: triggerData.price ? Number(triggerData.price) : undefined,
          }
        },
        actions: actions.map(action => ({
          id: action.type,
          type: action.type,
          config: (() => {
            
            const { type, ...config } = action as any;
            return config;
          })()
        })),
        txHash: receipt.transactionHash,
        status: 'pending'
      };

      console.log('Sending to backend:', JSON.stringify(backendData, null, 2));
      
      
      const zapId = `zap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      
      const triggerName = triggerData.type === 'webhook' 
        ? 'Webhook Trigger' 
        : `Price ${triggerData.type === 'price_above' ? 'Above' : 'Below'} ${triggerData.price} ${triggerData.token}`;
      
      const actionNames = actions.map(action => {
        if (action.type === 'email') return 'Send Email';
        if (action.type === 'webhook') return 'Webhook Action';
        return 'Action';
      }).join(' + ');
      
      const zapName = `${triggerName} → ${actionNames}`;
      
      
      const testUrl = `/api/test-zap/${zapId}`;
      
      
      const newZap = {
        id: zapId,
        name: zapName,
        status: 'active',
        trigger: {
          type: triggerData.type,
          ...(triggerData.price && { price: triggerData.price }),
          ...(triggerData.token && { token: triggerData.token }),
          ...(triggerData.chain && { chain: triggerData.chain }),
          ...(triggerData.webhookUrl && { webhookUrl: triggerData.webhookUrl }),
        },
        actions: actions.map(action => ({
          type: action.type,
          config: { ...action }
        })),
        testUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      
      try {
        const savedZaps = JSON.parse(localStorage.getItem('mockZaps') || '{}');
        savedZaps[zapId] = newZap;
        localStorage.setItem('mockZaps', JSON.stringify(savedZaps));
        
        
        window.dispatchEvent(new Event('storage'));
        
        console.log('Saved new zap to localStorage:', JSON.stringify(newZap, null, 2));
      } catch (error) {
        console.error('Failed to save zap to localStorage:', error);
      }
      
      
      const response = await fetch('/api/zaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendData)
      });
      
      const responseText = await response.text();
      let result;
      
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse backend response:', e);
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        console.error('Backend error:', result);
        
        console.log('Zap saved to localStorage, but backend save failed. Continuing...');
        
        return { ...newZap, id: zapId };
      }
      
      console.log('Zap saved to backend:', JSON.stringify(result, null, 2));
      
      
      console.log('Zap created and monitoring started successfully!');
      
      
      if (result?.id) {
        const newZapId = result.id;
        
        setTimeout(() => {
          localStorage.setItem('newZapId', newZapId);
        }, 100);
      }
      
      
      router.push('/dashboard?zap_created=true');
    } catch (error) {
      console.error('Error creating Zap:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('on-chain but failed to start monitoring')) {
        console.error(errorMessage); 
      } else {
        console.error(`Error: ${errorMessage}`); 
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Appbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Create New Zap</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Choose a Trigger</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className={`p-4 border rounded-lg text-left ${selectedTrigger === 'price' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedTrigger('price')}
            >
              <h3 className="font-medium">Price Alert</h3>
              <p className="text-sm text-gray-500">Trigger when a token price crosses a threshold</p>
            </button>
            <button
              className={`p-4 border rounded-lg text-left ${selectedTrigger === 'webhook' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedTrigger('webhook')}
            >
              <h3 className="font-medium">Webhook</h3>
              <p className="text-sm text-gray-500">Trigger from any webhook</p>
            </button>
            <button
              className={`p-4 border rounded-lg text-left ${selectedTrigger === 'google' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedTrigger('google')}
            >
              <h3 className="font-medium">Google Workspace</h3>
              <p className="text-sm text-gray-500">Connect Gmail, Sheets, and Calendar</p>
            </button>
          </div>
        </div>

        {/* Google Workflow Configuration */}
        {selectedTrigger === 'google' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Configure Google Workflow</h2>
            <GoogleWorkflowConfig 
              onComplete={(workflow) => {
                console.log('Workflow created:', JSON.stringify(workflow, null, 2));
                setGoogleWorkflow(workflow);
                
                toast.success('Google Workflow configured! Click "Create Zap" below to create it.');
              }}
              onBack={() => setSelectedTrigger(null)}
            />
          </div>
        )}

        {/* Trigger Section */}
        {selectedTrigger === 'price' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">1. Choose a Trigger</h2>
            
            {/* Price trigger form */}
            <div className="mt-4 p-4 border rounded-lg bg-white">
              <h3 className="text-lg font-medium mb-4">Set Price Alert</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={triggerData?.token || ''}
                    onChange={(e) => setTriggerData({
                      ...triggerData!,
                      token: e.target.value,
                      type: triggerData?.type || 'price_above',
                      price: triggerData?.price || 0,
                      chain: triggerData?.chain || 'ethereum'
                    })}
                  >
                    <option value="">Select a token</option>
                    <option value="WETH">WETH</option>
                    <option value="WBTC">WBTC</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={triggerData?.type || 'price_above'}
                    onChange={(e) => setTriggerData({
                      ...triggerData!,
                      type: e.target.value as 'price_above' | 'price_below',
                      token: triggerData?.token || 'WETH',
                      price: triggerData?.price || 0,
                      chain: triggerData?.chain || 'ethereum' 
                    })}
                  >
                    <option value="price_above">Price above</option>
                    <option value="price_below">Price below</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={triggerData?.price || ''}
                    onChange={(e) => setTriggerData({
                      ...triggerData!,
                      price: parseFloat(e.target.value) || 0,
                      type: triggerData?.type || 'price_above', 
                      token: triggerData?.token || 'WETH',
                      chain: triggerData?.chain || 'ethereum' 
                    })}
                    placeholder="Enter target price"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedTrigger(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddTrigger({
                      type: triggerData?.type as 'price_above' | 'price_below' || 'price_above',
                      token: triggerData?.token || 'WETH',
                      price: triggerData?.price || 0,
                      chain: 'ethereum'
                    })}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    disabled={!triggerData?.price || !triggerData?.token}
                  >
                    Add Trigger
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {selectedTrigger === 'webhook' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">2. Configure Webhook</h2>
            <WebhookTrigger 
              onAddTrigger={(trigger) => {
                handleAddTrigger({
                  ...trigger,
                  type: 'webhook',
                  chain: 'ethereum',
                  token: 'WETH' // Default token, though not used by webhook
                });
              }} 
              onCancel={() => setSelectedTrigger(null)} 
            />
          </div>
        )}

        {/* Selected Trigger Display */}
        {triggerData && !['price', 'webhook', 'google'].includes(selectedTrigger as string) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-green-200">
            <h2 className="text-xl font-semibold mb-4">Selected Trigger</h2>
            <div className="p-4 bg-green-50 rounded-md">
              {triggerData.type === 'price_above' || triggerData.type === 'price_below' ? (
                <div>
                  <h3 className="font-medium">Price Alert</h3>
                  <p className="text-sm text-gray-600">
                    {triggerData.token} price {triggerData.type === 'price_above' ? 'above' : 'below'} ${triggerData.price}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Chain: {triggerData.chain}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium">Webhook Trigger</h3>
                  <p className="text-sm text-gray-600">
                    Webhook ID: {triggerData.webhookId}
                  </p>
                </div>
              )}
              <button
                onClick={() => setTriggerData(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Change Trigger
              </button>
            </div>
          </div>
        )}

        {/* Actions Section - Only show for non-Google triggers */}
        {!googleWorkflow && selectedTrigger !== 'google' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Add Actions</h2>
            
            {actions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No actions added yet.</p>
                <div className="space-x-4">
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Email Action
                  </button>
                  <button
                    onClick={() => setShowWebhookForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Webhook Action
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">
                          {action.type === 'email' ? 'Email' : 'Webhook'} Action
                        </h3>
                        {action.type === 'email' && (
                          <p className="text-sm text-gray-600">
                            To: {(action as EmailActionData).to} | Subject: {(action as EmailActionData).subject}
                          </p>
                        )}
                        {action.type === 'webhook' && (
                          <p className="text-sm text-gray-600">URL: {(action as WebhookActionData).url}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const newActions = [...actions];
                          newActions.splice(index, 1);
                          setActions(newActions);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Add Email Action
                  </button>
                  <button
                    onClick={() => setShowWebhookForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Add Webhook Action
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Google Workflow Info - Show when Google workflow is configured */}
        {googleWorkflow && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Workflow Configured ✓</h2>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">
                {googleWorkflow.name || 'Google Workspace Workflow'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Your workflow includes {googleWorkflow.steps?.length || 0} step(s)
              </p>
              <div className="space-y-2">
                {googleWorkflow.steps?.map((step: any, index: number) => (
                  <div key={index} className="text-sm text-gray-700 flex items-center">
                    <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    {step.title || step.type}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ℹ️ Google Workflows don't require blockchain interaction - they're saved directly to your account.
              </p>
            </div>
          </div>
        )}

        {/* Email Action Form Modal */}
        {showEmailForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Add Email Action</h3>
              <EmailActionForm 
                onAddAction={(data: EmailActionData) => handleAddAction(data)} 
                onCancel={() => setShowEmailForm(false)} 
              />
            </div>
          </div>
        )}

        {/* Webhook Action Form Modal */}
        {showWebhookForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-medium mb-4">Add Webhook Action</h3>
              <WebhookActionForm
                onAddAction={(data) => {
                  handleAddAction(data);
                  setShowWebhookForm(false);
                }}
                onCancel={() => setShowWebhookForm(false)}
              />
            </div>
          </div>
        )}
        
        {/* Create Zap Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleCreateZap}
            disabled={!((triggerData || googleWorkflow) && (actions.length > 0 || (googleWorkflow && googleWorkflow.steps && googleWorkflow.steps.length > 0))) || isLoading}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              (triggerData || googleWorkflow) && (actions.length > 0 || (googleWorkflow && googleWorkflow.steps && googleWorkflow.steps.length > 0))
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            } transition-colors`}
          >
            {isLoading ? 'Creating...' : 'Create Zap'}
          </button>
        </div>
      </div>
    </main>
  );
}

