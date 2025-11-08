import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface WebhookTriggerProps {
  onAddTrigger: (trigger: { type: string; webhookId: string }) => void;
  onCancel: () => void;
}

const WebhookTrigger: React.FC<WebhookTriggerProps> = ({ onAddTrigger, onCancel }) => {
  const [webhookId, setWebhookId] = useState('');

  const generateWebhook = () => {
    const newId = uuidv4();
    setWebhookId(newId);
    const trigger = {
      type: 'webhook',
      webhookId: newId,
    };
    onAddTrigger(trigger);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold">Webhook Trigger</h3>
      {webhookId ? (
        <div className="mt-2">
          <p>Your webhook URL:</p>
          <input
            type="text"
            readOnly
            value={`${window.location.origin}/api/webhook/${webhookId}`}
            className="w-full p-2 border rounded bg-gray-100"
          />
          <p className="text-sm text-gray-500 mt-1 mb-2">A POST request to this URL will trigger your Zap.</p>
          <button
            onClick={onCancel}
            className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={generateWebhook}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Generate Webhook URL
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default WebhookTrigger;
