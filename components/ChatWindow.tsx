
import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { SendIcon } from './icons/SendIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ChatHeader } from './ChatHeader';
import { CheckIcon } from './icons/CheckIcon';
import { CheckAllIcon } from './icons/CheckAllIcon';
import { safeDate } from '../utils';

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

    // Cryptographic Dispatch Protocol
    const timestamp = Date.now();
    const nonce = cryptoService.generateNonce();
    const payload = `MSG:${currentUser.id}:${conversation.id}:${newMessage.trim()}:${timestamp}:${nonce}`;
    const signature = cryptoService.signTransaction(payload);

    const messageData: Omit<Message, 'id' | 'timestamp'> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: newMessage.trim(),
      signature: signature,
      hash: payload,
      nonce: nonce
    };
    
    setNewMessage('');
    try {
      await api.sendMessage(conversation.id, messageData, conversation);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const formatMessageTime = (timestamp: any) => {
      const date = safeDate(timestamp);
      if (!date) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const otherMemberId = conversation.isGroup ? null : conversation.members.find(id => id !== currentUser.id);
  const otherMemberName = otherMemberId ? conversation.memberNames[otherMemberId] : 'System Node';

  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
      
      <ChatHeader
        title={conversation.isGroup ? conversation.name || 'Group Comms' : otherMemberName}
        isGroup={conversation.isGroup}
        onBack={onBack}
        onHeaderClick={onHeaderClick}
      />
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative z-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-50"/></div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === currentUser.id;
            const showSender = conversation.isGroup && !isOwnMessage && (index === 0 || messages[index-1].senderId !== msg.senderId);
            const isRead = isOwnMessage && conversation.readBy.some(id => id !== currentUser.id);

            return (
                <div key={msg.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} animate-fade-in`}>
                    {showSender && <span className="label-caps !text-[8px] !text-gray-600 ml-1 mb-2 !tracking-[0.4em]">{msg.senderName}</span>}
                    <div className={`flex flex-col max-w-[90%] md:max-w-xl ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                         <div className={`px-6 py-4 rounded-2xl relative shadow-2xl border transition-all ${isOwnMessage ? 'bg-brand-gold text-slate-950 border-brand-gold/20 rounded-tr-none font-bold' : 'bg-slate-900 text-gray-200 border-white/5 rounded-tl-none font-medium'}`}>
                            <p className="break-words leading-relaxed whitespace-pre-wrap text-[13px] tracking-wide">{msg.text}</p>
                         </div>
                         <div className="flex items-center gap-3 mt-2 px-1">
                            <span className="data-mono text-[9px] text-gray-600 font-black uppercase tracking-tighter">
                                {msg.timestamp ? formatMessageTime(msg.timestamp) : 'SYNCING...'}
                            </span>
                            {isOwnMessage && msg.timestamp && (
                                <span title={isRead ? "Sync Verified" : "Buffered"} className="flex items-center">
                                    {isRead ? <CheckAllIcon className="h-4 w-4 text-green-500" /> : <CheckIcon className="h-4 w-4 text-gray-700" />}
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
      
      <div className="p-6 border-t border-white/5 flex-shrink-0 bg-slate-950/80 backdrop-blur-2xl relative z-20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4 max-w-5xl mx-auto">
          <div className="relative flex-1 group">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="DISPATCH COMMAND..."
                className="data-mono w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all placeholder-gray-800 tracking-widest uppercase"
                disabled={isLoading}
              />
          </div>
          <button 
            type="submit" 
            className="p-5 rounded-2xl text-slate-950 shadow-glow-gold bg-brand-gold hover:bg-brand-gold-light active:scale-90 transition-all disabled:opacity-30 disabled:grayscale"
            disabled={!newMessage.trim()}
          >
            <SendIcon className="h-6 w-6" />
          </button>
        </form>
        <p className="text-[7px] font-black text-gray-700 uppercase text-center mt-4 tracking-[0.6em]">End-to-End Handshake Active</p>
      </div>
    </div>
  );
};
