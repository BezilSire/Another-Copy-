import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SendIcon } from './icons/SendIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ChatsPageProps {
  user: User;
  initialTarget: Conversation | null;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onNewMessageClick: () => void;
  onNewGroupClick: () => void;
}

export const ChatsPage: React.FC<ChatsPageProps> = ({ user, initialTarget, onClose, onViewProfile, onNewMessageClick, onNewGroupClick }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(initialTarget);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const unsub = api.listenForConversations(user.id, (convos) => {
      setConversations(convos);
      setIsLoading(false);
    });
    return () => unsub();
  }, [user.id]);

  useEffect(() => {
    if (activeConversation) {
      const unsub = api.listenForMessages(activeConversation.id, user, (msgs: any[]) => {
        setMessages(msgs);
        api.markConversationAsRead(activeConversation.id, user.id);
      });
      return () => unsub();
    } else {
      setMessages([]);
    }
  }, [activeConversation, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      await api.sendMessage(activeConversation.id, { senderId: user.id, senderName: user.name, content: newMessage }, activeConversation);
      setNewMessage('');
    } catch (err) {
      addToast("Failed to send message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const getOtherMemberName = (convo: Conversation) => {
    if (convo.isGroup) return convo.name || 'Group Chat';
    const otherId = convo.members.find(id => id !== user.id);
    return otherId ? convo.memberNames[otherId] : 'Unknown Node';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-midnight/80 backdrop-blur-md border-b border-white/5 py-6 px-8 flex items-center justify-between shadow-premium">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors group">
            <ArrowLeftIcon className="h-8 w-8 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-2xl border-2 border-brand-gold/30 flex items-center justify-center shadow-glow-gold">
              <MessageSquareIcon className="h-6 w-6 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Comms Protocol</h2>
              <p className="text-[9px] font-bold text-brand-gold tracking-[0.4em] uppercase opacity-60 mt-1">Neural Mesh Synchronized</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={onNewMessageClick} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white/70 hover:text-white transition-all">
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <aside className={`w-full md:w-96 border-r border-white/5 bg-midnight-light overflow-y-auto no-scrollbar ${activeConversation ? 'hidden md:block' : 'block'}`}>
          <div className="p-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-40" />
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setActiveConversation(convo)}
                  className={`w-full p-5 rounded-[2.5rem] border transition-all text-left flex items-center gap-4 group ${activeConversation?.id === convo.id ? 'bg-brand-gold border-brand-gold shadow-glow-gold' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${activeConversation?.id === convo.id ? 'bg-slate-950 border-slate-900 text-brand-gold' : 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold group-hover:border-brand-gold/50'}`}>
                    <UserCircleIcon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className={`text-sm font-black uppercase tracking-tighter truncate ${activeConversation?.id === convo.id ? 'text-slate-950' : 'text-white'}`}>
                        {getOtherMemberName(convo)}
                      </p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest ${activeConversation?.id === convo.id ? 'text-slate-950/60' : 'text-white/20'}`}>
                        {new Date(convo.lastMessageTimestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className={`text-xs font-medium truncate ${activeConversation?.id === convo.id ? 'text-slate-950/80' : 'text-white/40'}`}>
                      {convo.lastMessage}
                    </p>
                  </div>
                  {!convo.readBy.includes(user.id) && activeConversation?.id !== convo.id && (
                    <div className="w-2.5 h-2.5 bg-brand-gold rounded-full shadow-glow-gold"></div>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem]">
                <p className="text-xs font-bold text-white/20 uppercase tracking-[0.3em]">No active comms channels.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className={`flex-1 flex flex-col bg-black relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              <div className="p-6 border-b border-white/5 bg-midnight/40 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveConversation(null)} className="md:hidden text-white/40 hover:text-white transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-gold/10 rounded-xl border border-brand-gold/20 flex items-center justify-center">
                      <UserCircleIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">{getOtherMemberName(activeConversation)}</h3>
                      <p className="text-[9px] font-bold text-green-400 tracking-[0.3em] uppercase opacity-60 mt-1">Channel Secure</p>
                    </div>
                  </div>
                </div>
                {!activeConversation.isGroup && (
                  <button 
                    onClick={() => {
                        const otherId = activeConversation.members.find(id => id !== user.id);
                        if (otherId) onViewProfile(otherId);
                    }}
                    className="text-[10px] font-black text-brand-gold hover:text-brand-gold-light transition-colors uppercase tracking-widest"
                  >
                    View Identity
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user.id;
                  const showName = idx === 0 || messages[idx-1].senderId !== msg.senderId;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showName && !isMe && (
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 ml-4">{msg.senderName}</p>
                      )}
                      <div className={`max-w-[80%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed relative ${isMe ? 'bg-brand-gold text-slate-950 rounded-tr-none shadow-glow-gold' : 'bg-white/5 text-white border border-white/5 rounded-tl-none'}`}>
                        {msg.text}
                        <p className={`text-[8px] font-bold uppercase tracking-widest mt-2 ${isMe ? 'text-slate-950/40' : 'text-white/20'}`}>
                          {new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-8 border-t border-white/5 bg-midnight/40 backdrop-blur-sm">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-white/5 border-2 border-white/10 rounded-[2.5rem] py-6 pl-8 pr-20 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold placeholder:text-white/10"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="absolute right-3 w-14 h-14 bg-brand-gold hover:bg-brand-gold-light text-slate-950 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-glow-gold disabled:opacity-50"
                  >
                    {isSending ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <SendIcon className="h-6 w-6" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20">
              <div className="w-32 h-32 bg-white/5 rounded-[3rem] border-2 border-white/10 flex items-center justify-center mb-8">
                <MessageSquareIcon className="h-16 w-16 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-4">Neural Mesh Standby</h3>
              <p className="text-sm font-bold text-white uppercase tracking-widest max-w-xs">Select a comms channel from the sidebar to initiate synchronization.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
