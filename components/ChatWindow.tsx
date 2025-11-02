import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import { api } from '../services/apiService';
import { SendIcon } from './icons/SendIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ChatHeader } from './ChatHeader';
import { formatTimeAgo } from '../utils';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onBack?: () => void;
  onHeaderClick?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onBack, onHeaderClick }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    // FIX: Added the missing onError callback to the listenForMessages function call.
    const unsubscribe = api.listenForMessages(
      conversation.id,
      (msgs) => {
        setMessages(msgs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to listen for messages:", error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [conversation.id]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData: Omit<Message, 'id' | 'timestamp'> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: newMessage.trim(),
    };
    
    setNewMessage('');
    try {
      await api.sendMessage(conversation.id, messageData, conversation);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const otherMemberId = conversation.isGroup ? null : conversation.members.find(id => id !== currentUser.id);
  const otherMemberName = otherMemberId ? conversation.memberNames[otherMemberId] : 'Group';

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <ChatHeader
        title={conversation.isGroup ? conversation.name || 'Group Chat' : otherMemberName}
        isGroup={conversation.isGroup}
        onBack={onBack}
        onHeaderClick={onHeaderClick}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><LoaderIcon className="h-6 w-6 animate-spin"/></div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === currentUser.id;
            const showSender = conversation.isGroup && (index === 0 || messages[index-1].senderId !== msg.senderId);

            return (
                <div key={msg.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {showSender && <span className="text-xs text-gray-400 ml-12 mb-1">{msg.senderName}</span>}
                    <div className={`flex items-end max-w-xs md:max-w-md ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                         <div className={`px-4 py-2 rounded-2xl ${isOwnMessage ? 'bg-green-600 text-white rounded-br-none' : 'bg-slate-700 text-gray-200 rounded-bl-none'}`}>
                            <p className="text-sm break-words">{msg.text}</p>
                         </div>
                    </div>
                     <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
                        {msg.timestamp ? formatTimeAgo(msg.timestamp.toDate().toISOString()) : 'sending...'}
                    </p>
                </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-700 rounded-full py-2 px-4 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <button type="submit" className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-slate-600" disabled={!newMessage.trim()}>
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
