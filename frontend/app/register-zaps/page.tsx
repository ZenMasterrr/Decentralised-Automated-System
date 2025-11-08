'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Zap {
  id: string;
  trigger: any;
  actions: any[];
  status?: string;
}

export default function RegisterZapsPage() {
  const [status, setStatus] = useState<string>('');
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const registerAllZaps = async () => {
    setLoading(true);
    setStatus('Reading zaps from localStorage...');
    
    try {
      
      const zapsJson = localStorage.getItem('mockZaps');
      if (!zapsJson) {
        setStatus(' No zaps found in localStorage');
        setLoading(false);
        return;
      }

      const zapsObject = JSON.parse(zapsJson);
      const zaps = Object.values(zapsObject) as Zap[]; 
      setStatus(` Found ${zaps.length} zaps in localStorage`);

      let successCount = 0;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

      
      for (const zap of zaps) {
        try {
          console.log(` Registering zap: ${zap.id}`, { trigger: zap.trigger });
          
          const response = await fetch(`${backendUrl}/api/v1/zap/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: zap.id,
              trigger: zap.trigger,
              actions: zap.actions,
              status: 'active'
            })
          });

          const responseText = await response.text();
          console.log(`📥 Response for ${zap.id}:`, response.status, responseText);

          if (response.ok) {
            successCount++;
            console.log(` Registered zap: ${zap.id}`);
          } else {
            console.error(` Failed to register zap: ${zap.id} - Status: ${response.status} - ${responseText}`);
          }
        } catch (error) {
          console.error(` Error registering zap ${zap.id}:`, error);
        }
      }

      setRegisteredCount(successCount);
      setStatus(` Successfully registered ${successCount} out of ${zaps.length} zaps for automatic monitoring!`);

    } catch (error) {
      console.error('Error registering zaps:', error);
      setStatus(` Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Register Zaps for Automatic Monitoring</CardTitle>
            <CardDescription>
              Register your existing localStorage zaps with the backend so they can be monitored automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 What This Does:</h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
                <li>Reads all zaps from your browser's localStorage</li>
                <li>Registers them with the backend for automatic monitoring</li>
                <li>Enables Gmail triggers to work automatically</li>
                <li>Enables price alerts to work automatically</li>
              </ul>
            </div>

            <Button 
              onClick={registerAllZaps} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? '⏳ Registering...' : '🚀 Register All Zaps'}
            </Button>

            {status && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-sm font-mono whitespace-pre-wrap">{status}</p>
              </div>
            )}

            {registeredCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Success!</h3>
                <p className="text-green-800 text-sm">
                  Your {registeredCount} zap{registeredCount !== 1 ? 's are' : ' is'} now registered for automatic monitoring.
                </p>
                <p className="text-green-700 text-xs mt-2">
                  The backend will check Gmail every 60 seconds for matching emails and execute your Google Workflows automatically.
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h3>
              <ul className="list-disc list-inside text-yellow-800 space-y-1 text-sm">
                <li>Make sure the hooks backend is running (http://localhost:3002)</li>
                <li>You need to register zaps only ONCE</li>
                <li>New zaps created after this will auto-register</li>
                <li>If you edit a zap, register again to update</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
