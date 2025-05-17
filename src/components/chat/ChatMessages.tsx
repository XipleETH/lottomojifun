import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../types';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className="mb-2 bg-gray-50 rounded-lg p-2"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span className="font-medium">
              {message.username || 'Anónimo'}
            </span>
            <span>
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {message.emojis.map((emoji, index) => (
              <span key={`${message.id}-${index}`}>{emoji}</span>
            ))}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};