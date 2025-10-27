

import React, { useState, useEffect, useRef } from 'react';
import { initializeChat, getChatBotResponse } from '../services/geminiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { SendIcon } from './icons/SendIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { User } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

interface Message {
  author: 'user' | 'bot';
  text: string;
}

const mapMessagesToHistory = (messages: Message[]) => {
  // Filter out the initial bot greeting message and map to the format Gemini expects.
  // The history must be an alternating sequence of user and model parts.
  return messages.slice(1).map(message => ({
    role: message.author === 'user' ? 'user' : 'model',
    parts: [{ text: message.text }]
  }));
};

export const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const CHAT_HISTORY_KEY = `chatHistory_${currentUser.id}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      try {
        const savedMessagesRaw = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedMessagesRaw) {
          const savedMessages = JSON.parse(savedMessagesRaw);
          setMessages(savedMessages);
          initializeChat(mapMessagesToHistory(savedMessages));
        } else {
          const initialMessage = { author: 'bot', text: "Hello! I'm the Ubuntium Assistant. How can I help you today?" };
          setMessages([initialMessage]);
          initializeChat();
        }
      } catch (error) {
        console.error("Failed to load or initialize chat:", error);
        const initialMessage = { author: 'bot', text: "Hello! I'm the Ubuntium Assistant. How can I help you today?" };
        setMessages([initialMessage]);
        initializeChat();
      }
      setInput('');
      setIsLoading(false);
    }
  }, [isOpen, CHAT_HISTORY_KEY]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save chat history:", error);
      }
    }
  }, [messages, isOpen, CHAT_HISTORY_KEY]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { author: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatBotResponse(userMessage.text);
      const botMessage: Message = { author: 'bot', text: response };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      const botErrorMessage: Message = { author: 'bot', text: `Sorry, I encountered an error: ${errorMessage}` };
      setMessages(prev => [...prev, botErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-24 sm:right-8 w-full h-full sm:w-96 sm:h-[600px] bg-slate-800 border-t sm:border border-slate-700 rounded-none sm:rounded-lg shadow-2xl flex flex-col z-40 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center space-x-2">
           {isMobile && (
            <button onClick={onClose} className="text-gray-400 hover:text-white -ml-1 mr-2 p-1" aria-label="Back">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          )}
          <SparkleIcon className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-bold text-white">Ubuntium Assistant</h3>
        </div>
        {!isMobile && (
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close chat">
            <XCircleIcon className="h-6 w-6" />
            </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.author === 'user' ? 'justify-end' : ''}`}>
            {msg.author === 'bot' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><SparkleIcon className="h-5 w-5 text-green-400" /></div>}
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.author === 'user' ? 'bg-green-600 text-white rounded-br-lg' : 'bg-slate-700 text-gray-200 rounded-bl-lg'}`}>
              <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>
            </div>
            {msg.author === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-400" /></div>}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><SparkleIcon className="h-5 w-5 text-green-400" /></div>
            <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-slate-700 text-gray-200 rounded-bl-lg flex items-center space-x-2">
                <LoaderIcon className="h-4 w-4 animate-spin"/>
                <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-slate-700 rounded-full py-2 px-4 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-slate-600" disabled={isLoading || !input.trim()}>
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};