import React, { useState } from 'react';

export interface EmailAction {
  type: 'email';
  to: string;
  subject: string;
  body: string;
}

interface EmailActionFormProps {
  onAddAction: (action: EmailAction) => void;
  onCancel?: () => void;
}

const EmailActionForm: React.FC<EmailActionFormProps> = ({ onAddAction, onCancel }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action: EmailAction = {
      type: 'email',
      to,
      subject,
      body,
    };
    onAddAction(action);
    
    setTo('');
    setSubject('');
    setBody('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-bold mb-4">Send Email Action</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Email
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="recipient@example.com"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Email subject"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
            placeholder="Enter your email message here..."
            required
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Action
        </button>
      </div>
    </form>
  );
};

export default EmailActionForm;