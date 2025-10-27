import React, { useState, useEffect, useRef } from 'react';
import { Conversation, User, Message } from '../types';
import { api } from '../services/apiService';
import { SendIcon } from './icons/SendIcon';
import { Timestamp } from 'firebase/firestore';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
}

const formatMessageTime = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};


export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = api.listenForMessages(conversation.id, setMessages);
    return () => unsubscribe();
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Omit<Message, 'id' | 'timestamp'> = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: newMessage,
    };

    try {
        await api.sendMessage(conversation.id, message, conversation);
        setNewMessage('');
    } catch (error) {
        console.error("Failed to send message", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/50">
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const showAuthor = conversation.isGroup && (index === 0 || messages[index-1].senderId !== msg.senderId);
            return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showAuthor && <p className="text-xs text-gray-400 mb-1 ml-2">{msg.senderName}</p>}
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${isMe ? 'bg-green-600 text-white rounded-br-lg' : 'bg-slate-700 text-gray-200 rounded-bl-lg'}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">{formatMessageTime(msg.timestamp)}</p>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-700 rounded-full py-2 px-4 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button type="submit" className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-slate-600" disabled={!newMessage.trim()}>
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};