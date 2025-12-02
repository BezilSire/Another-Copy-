
import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import { api } from '../services/apiService';
import { SendIcon } from './icons/SendIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ChatHeader } from './ChatHeader';
import { CheckIcon } from './icons/CheckIcon';
import { CheckAllIcon } from './icons/CheckAllIcon';

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
    const unsubscribe = api.listenForMessages(
      conversation.id,
      currentUser,
      (msgs) => {
        setMessages(msgs);
        setIsLoading(false);
        // Mark as read when messages load or update
        if (msgs.length > 0 && !conversation.readBy.includes(currentUser.id)) {
             api.markConversationAsRead(conversation.id, currentUser.id);
        }
      },
      (error) => {
        console.error("Failed to listen for messages:", error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [conversation.id, currentUser]);
  
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

  const formatMessageTime = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const otherMemberId = conversation.isGroup ? null : conversation.members.find(id => id !== currentUser.id);
  const otherMemberName = otherMemberId ? conversation.memberNames[otherMemberId] : 'Group';

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
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
            const showSender = conversation.isGroup && !isOwnMessage && (index === 0 || messages[index-1].senderId !== msg.senderId);
            
            // Check read status
            const isRead = isOwnMessage && conversation.readBy.some(id => id !== currentUser.id);

            return (
                <div key={msg.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {showSender && <span className="text-xs text-gray-400 ml-1 mb-1 font-semibold">{msg.senderName}</span>}
                    <div className={`flex flex-col max-w-[85%] md:max-w-md ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                         <div className={`px-4 py-2 rounded-2xl shadow-sm relative text-sm ${isOwnMessage ? 'bg-green-600 text-white rounded-br-none' : 'bg-slate-700 text-gray-200 rounded-bl-none'}`}>
                            <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                         </div>
                         <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-[10px] text-gray-500">
                                {msg.timestamp ? formatMessageTime(msg.timestamp) : 'sending...'}
                            </span>
                            {isOwnMessage && msg.timestamp && (
                                <span title={isRead ? "Read" : "Sent"}>
                                    {isRead ? <CheckAllIcon className="h-3 w-3 text-blue-400" /> : <CheckIcon className="h-3 w-3 text-gray-400" />}
                                </span>
                            )}
                         </div>
                    </div>
                </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <div className="relative flex-1 group">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 w-full bg-slate-700 rounded-full py-3 pl-5 pr-4 text-white border transition-all duration-300 focus:outline-none focus:ring-2 border-slate-600 focus:ring-blue-500"
                disabled={isLoading}
              />
          </div>
          <button 
            type="submit" 
            className="p-3 rounded-full text-white shadow-lg transform transition-all duration-200 active:scale-95 disabled:bg-slate-600 disabled:shadow-none disabled:transform-none bg-blue-600 hover:bg-blue-500"
            disabled={!newMessage.trim()}
            title="Send Message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
