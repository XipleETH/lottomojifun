import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';

// In a real app, this would be replaced with actual WebSocket logic
const mockMessages: ChatMessage[] = [];
const listeners: ((messages: ChatMessage[]) => void)[] = [];

const broadcastMessages = () => {
  listeners.forEach(listener => listener(mockMessages));
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const handleMessages = (newMessages: ChatMessage[]) => {
      setMessages([...newMessages]);
    };

    listeners.push(handleMessages);
    handleMessages(mockMessages);

    return () => {
      const index = listeners.indexOf(handleMessages);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const sendMessage = useCallback((emojis: string[]) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      emojis,
      timestamp: Date.now()
    };

    mockMessages.push(newMessage);
    broadcastMessages();
  }, []);

  return { messages, sendMessage };
}