'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import { Plus, RefreshCw, Zap, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { toast } from 'sonner';

interface ZapListProps {
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: (error: string | null) => void;
  onZapCreated?: () => void;
}

interface Zap {
  id: string;
  name: string;
  status: string;
  trigger: {
    type: string;
    [key: string]: any;
  };
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  testUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function ZapList({ onLoadingChange, onError, onZapCreated }: ZapListProps) {
  const [zaps, setZaps] = useState<Zap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingZap, setTestingZap] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newZapId, setNewZapId] = useState<string | null>(null);
  
  // Check for new zap ID in localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const zapId = localStorage.getItem('newZapId');
      if (zapId) {
        setNewZapId(zapId);
        // Clear the newZapId from localStorage after reading
        localStorage.removeItem('newZapId');
      }
    }
  }, []);

  // After the zaps are loaded, check if we need to scroll to a new zap
  useEffect(() => {
    if (newZapId && zaps.length > 0 && !isLoading) {
      const newZapElement = document.getElementById(`zap-${newZapId}`);
      if (newZapElement) {
        newZapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after animation
        setTimeout(() => {
          setNewZapId(null);
        }, 3000);
      }
    }
  }, [newZapId, zaps, isLoading]);

  // Add a welcome message when a new zap is created
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('zap_created') === 'true') {
        toast.success('Zap created successfully!', {
          description: 'Your new zap is now active and will trigger based on your settings.'
        });
        
        // Clean up the URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Notify parent component of loading state changes
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Notify parent component of error state changes
  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  const loadZaps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to load zaps from localStorage
      const savedZaps = localStorage.getItem('mockZaps');
      if (savedZaps) {
        const parsedZaps = Object.values(JSON.parse(savedZaps)) as Zap[];
        setZaps(parsedZaps);
      }
      
      // In a real app, you would fetch zaps from your API here
      // const response = await fetch('/api/zaps');
      // if (!response.ok) throw new Error('Failed to fetch zaps');
      // const data = await response.json();
      // setZaps(data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load zaps';
      console.error('Error loading zaps:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZaps();
    
    // Listen for storage events to update the list when zaps are added/updated
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mockZaps' && e.newValue) {
        try {
          const updatedZaps = Object.values(JSON.parse(e.newValue)) as Zap[];
          setZaps(updatedZaps);
          
          // Notify parent that a new zap was created
          if (onZapCreated && e.oldValue) {
            try {
              const oldZaps = e.oldValue ? JSON.parse(e.oldValue) : {};
              if (Object.keys(oldZaps).length < updatedZaps.length) {
                onZapCreated();
              }
            } catch (parseError) {
              console.error('Error comparing old and new zaps:', parseError);
            }
          }
        } catch (parseError) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse zaps';
          console.error('Failed to parse updated zaps:', errorMessage);
          setError(errorMessage);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadZaps, onZapCreated]);

  const testZap = async (zap: Zap) => {
    if (!zap.testUrl) {
      toast.error('This zap cannot be tested (missing test URL)');
      return;
    }

    setTestingZap(zap.id);
    
    try {
      // Check if this is a mock zap (stored in localStorage)
      const isMockZap = zap.id.startsWith('zap-') || zap.id.startsWith('mock-zap-');
      
      // For mock zaps, send the zap data in the request body
      const requestBody = isMockZap ? { zap } : undefined;
      
      const response = await fetch(zap.testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Zap "${zap.name}" tested successfully!`);
        console.log('Zap test result:', result);
      } else {
        throw new Error(result.message || 'Failed to test zap');
      }
    } catch (error) {
      console.error('Error testing zap:', error);
      toast.error(`Failed to test zap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingZap(null);
    }
  };

  const deleteZap = async (zapId: string, zapName: string) => {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${zapName}"?`)) {
      return;
    }

    try {
      // Remove from localStorage
      const savedZaps = localStorage.getItem('mockZaps');
      if (savedZaps) {
        const zapsObj = JSON.parse(savedZaps);
        delete zapsObj[zapId];
        localStorage.setItem('mockZaps', JSON.stringify(zapsObj));
        
        // Update state
        setZaps(Object.values(zapsObj) as Zap[]);
        
        toast.success(`Zap "${zapName}" deleted successfully`);
      }
      
      // In a real app, you would also delete from the backend API
      // await fetch(`/api/zaps/${zapId}`, { method: 'DELETE' });
      
    } catch (error) {
      console.error('Error deleting zap:', error);
      toast.error(`Failed to delete zap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading zaps...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">Error loading zaps: {error}</div>
        <Button variant="outline" onClick={loadZaps}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (zaps.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No zaps found</h3>
        <p className="text-gray-500 mb-4">Create your first zap to get started!</p>
        <Link href="/create-zap">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Zap
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Zaps</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zaps.map((zap) => {
          const isNew = zap.id === newZapId;
          return (
            <Card 
              key={zap.id} 
              className={`flex flex-col transition-all duration-300 ${isNew ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
              id={`zap-${zap.id}`}
            >
            <CardHeader>
              <CardTitle className="text-lg">{zap.name}</CardTitle>
              <CardDescription>
                Trigger: {zap.trigger?.type || 'Unknown'}
                <br />
                Status: <span className="font-medium text-green-600">{zap.status}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="font-medium mb-1">Actions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {zap.actions?.map((action, i) => {
                    // Determine what to display based on action type
                    let displayValue = 'N/A';
                    
                    if (action.type === 'email') {
                      displayValue = action.config?.to || 'N/A';
                    } else if (action.type === 'webhook') {
                      displayValue = action.config?.url || 'N/A';
                    } else if (action.type === 'sheets') {
                      const sheetName = action.config?.sheetName || 'Sheet1';
                      const spreadsheetId = action.config?.spreadsheetId;
                      displayValue = spreadsheetId 
                        ? `${sheetName} (${spreadsheetId.substring(0, 8)}...)`
                        : sheetName;
                    } else if (action.type === 'calendar') {
                      displayValue = action.config?.eventTitle || 'Calendar Event';
                    }
                    
                    return (
                      <li key={i}>
                        • {action.type}: {displayValue}
                      </li>
                    );
                  }) || <li>No actions configured</li>}
                </ul>
              </div>
              
              <div className="flex flex-col space-y-2 pt-2 border-t">
                <span className="text-xs text-gray-500">
                  Created: {new Date(zap.createdAt).toLocaleDateString()}
                </span>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => testZap(zap)}
                    disabled={testingZap === zap.id}
                  >
                    {testingZap === zap.id ? 'Testing...' : 'Test'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteZap(zap.id, zap.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ZapList;
