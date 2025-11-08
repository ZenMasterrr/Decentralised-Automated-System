import React, { useState } from 'react';

interface WebhookActionFormProps {
  onAddAction: (action: { type: 'webhook'; url: string; payload: Record<string, any> }) => void;
  onCancel: () => void;
}

const WebhookActionForm: React.FC<WebhookActionFormProps> = ({ onAddAction, onCancel }) => {
  const [url, setUrl] = useState('');
  const [payload, setPayload] = useState('{\n  "event": "webhook_triggered",\n  "data": {}\n}');
  const [isValidJson, setIsValidJson] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      alert('Please enter a webhook URL');
      return;
    }

    let parsedPayload = {};
    if (payload) {
      try {
        parsedPayload = JSON.parse(payload);
      } catch (e) {
        alert('Invalid JSON payload');
        return;
      }
    }

    onAddAction({
      type: 'webhook',
      url,
      payload: parsedPayload
    });
  };

  const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPayload(value);
    
    // Validate JSON
    if (value.trim() === '') {
      setIsValidJson(true);
      return;
    }
    
    try {
      JSON.parse(value);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL *
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          placeholder="https://example.com/webhook"
          required
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Payload (JSON)
          </label>
          {!isValidJson && (
            <span className="text-sm text-red-500">Invalid JSON</span>
          )}
        </div>
        <textarea
          value={payload}
          onChange={handlePayloadChange}
          className={`w-full h-40 p-2 border ${
            !isValidJson ? 'border-red-500' : 'border-gray-300'
          } rounded-md font-mono text-sm`}
          placeholder='{\n  "key": "value"\n}'
        />
        <p className="mt-1 text-xs text-gray-500">
          Use {'{event.data}'} to include the original webhook data
        </p>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValidJson || !url}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
            !isValidJson || !url
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Add Webhook Action
        </button>
      </div>
    </form>
  );
};

export default WebhookActionForm;
