
import React, { useState, useEffect, useRef } from 'react';
import { User, MemberUser } from '../types';
import { agentService, AgentMessage } from '../services/agentService';
import { cryptoService } from '../services/cryptoService';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { SendIcon } from './icons/SendIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { WalletIcon } from './icons/WalletIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { SirenIcon } from './icons/SirenIcon';
import { WalletDashboard } from './WalletDashboard';
import { WhatsAppManager } from './WhatsAppManager';
import { DistressCallModal } from './DistressCallModal';
import ReactMarkdown from 'react-markdown';

import { useAuth } from '../contexts/AuthContext';
import { safeJsonStringify } from '../utils';

interface AgenticShellProps {
  user: MemberUser;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
  onSwitchView: (view: 'brain' | 'oracle') => void;
  chatTargetId?: string | null;
  onChatStarted?: () => void;
  onOpenRecoverySetup?: () => void;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_wallet_balance",
      description: "Get the current UBT balance and transaction history for the user.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "send_ubt",
      description: "Send UBT assets to another node address (public key) in the commons.",
      parameters: {
        type: "object",
        properties: {
          receiverAddress: { type: "string", description: "The UBT address (public key) or email of the receiver" },
          amount: { type: "number", description: "The amount of UBT to send" },
          memo: { type: "string", description: "Optional note for the transaction" }
        },
        required: ["receiverAddress", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_commons_registry",
      description: "Search for other members or ventures in the Ubuntium Global Commons.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search term (name, email, or venture name)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_zim_pulse",
      description: "Get the latest intelligence feed from the Zim Pulse.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_receive_address",
      description: "Get the user's public key (node address) to receive UBT assets.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_public_ledger",
      description: "View the global public ledger of all UBT transactions in the Commons.",
      parameters: { type: "object", properties: { limit: { type: "number", description: "Number of transactions to show." } } }
    }
  },
  {
    type: "function",
    function: {
      name: "search_zim_pulse",
      description: "Search the real-time Zimbabwe commerce pulse for offers, needs, or jobs (Maize, Transport, USD/ZiG rates, etc).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The item or service to search for (e.g. 'Maize', 'Truck for hire')" },
          location: { type: "string", description: "Optional location filter (e.g. 'Harare', 'Bulawayo')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_security_status",
      description: "Check the cryptographic security status of your node, including vault and key anchors.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "start_simulation",
      description: "Initialize a new agentic simulation to predict market trends or social dynamics for profit strategies.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "The topic or scenario to simulate (e.g., 'Impact of new tax on street vendors')" }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "spawn_whatsapp_agent",
      description: "ADMIN ONLY: Spawn a new WhatsApp agent to index commerce data from a specific session or region.",
      parameters: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "The unique ID for the session (e.g., 'Ghost-Harare', 'Speaker-Bulawayo')" },
          forceReset: { type: "boolean", description: "Whether to clear existing session data and force a new QR code." }
        },
        required: ["sessionId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_whatsapp_agents",
      description: "ADMIN ONLY: List all active WhatsApp agents and their current connection status.",
      parameters: { type: "object", properties: {} }
    }
  }
];

export const AgenticShell: React.FC<AgenticShellProps> = ({ user, onLogout, onViewProfile, onSwitchView, chatTargetId, onChatStarted, onOpenRecoverySetup }) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'network'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (chatTargetId && onChatStarted) {
      const startChat = async () => {
        try {
          const targetUser = await api.getPublicUserProfile(chatTargetId);
          if (targetUser) {
            const initialMessage = `I'd like to reach out to ${targetUser.name} (${targetUser.role}). Can you help me draft a message or initiate a collaboration?`;
            setInput(initialMessage);
            // We don't auto-send, just set the input for the user to review
            onChatStarted();
          }
        } catch (error) {
          console.error('Error starting chat:', error);
        }
      };
      startChat();
    }
  }, [chatTargetId, onChatStarted]);

  useEffect(() => {
    const initialMessages: AgentMessage[] = [
      { role: 'system', content: agentService.getProtocolSystemInstruction(user) },
      { role: 'assistant', content: `Greetings, ${user.name}. The Ubuntium Global Commons is active. Your node is synchronized. How shall we advance our shared prosperity today?` }
    ];
    setMessages(initialMessages);
  }, [user]);

  useEffect(() => {
    // Add initial welcome message
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Resonating... Welcome, Member ${user.name}. I am the Commons Brain. I am here to facilitate your resonance within the Ubuntium Global Commons. How shall we contribute to the collective today?`
      }]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const executeTool = async (toolCall: any): Promise<{ result: string, widget?: React.ReactNode }> => {
    const { name, arguments: argsString } = toolCall.function;
    let args: any;
    try {
      args = JSON.parse(argsString);
    } catch (e) {
      console.error("Failed to parse tool arguments:", argsString);
      return { result: `Error: Invalid arguments provided for tool ${name}.` };
    }

    try {
      switch (name) {
        case 'get_wallet_balance': {
          const updatedUser = await api.getUser(user.id);
          // Attempt deep sync if node is anchored
          let ledgerBalance = updatedUser.ubtBalance;
          try {
            ledgerBalance = await api.reconcileUserBalance(user.id);
          } catch (e) {
            console.warn("Ledger reconciliation failed, using cached balance.");
          }

          const txs = await new Promise<any[]>((resolve, reject) => {
             const unsub = api.listenForUserTransactions(user.id, (data) => {
                unsub();
                resolve(data);
             }, (err) => {
                unsub();
                reject(err);
             });
          });
          
          const widget = (
            <div className="bg-slate-900/90 border border-brand-gold/30 p-6 rounded-[2rem] mt-4 space-y-6 shadow-glow-gold animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">
                    Ledger-Verified Balance
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-white">{(ledgerBalance ?? 0).toFixed(2)}</p>
                    <p className="text-xs font-black text-brand-gold">UBT</p>
                  </div>
                </div>
                <div className="bg-brand-gold/10 p-3 rounded-2xl border border-brand-gold/20 flex flex-col items-center gap-1">
                  <WalletIcon className="h-6 w-6 text-brand-gold" />
                  <span className="text-[8px] font-black text-brand-gold/60 uppercase">Mainnet</span>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Node Address</p>
                  <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full text-green-400 bg-green-400/10">
                    Anchored
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   <code className="text-[10px] font-mono text-brand-gold truncate flex-1">{updatedUser.publicKey || 'GENESIS_NODE'}</code>
                   <button 
                    onClick={() => {
                      navigator.clipboard.writeText(updatedUser.publicKey || '');
                      addToast("Node address copied", "success");
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Recent Ledger Entries</p>
                  <button 
                    onClick={() => setInput("Show me the public ledger")}
                    className="text-[8px] font-black text-brand-gold uppercase hover:underline"
                  >
                    View Global Ledger
                  </button>
                </div>
                {txs.length > 0 ? txs.slice(0, 3).map(tx => {
                  const isReceiver = tx.receiverId === user.id || tx.receiverPublicKey === user.publicKey;
                  return (
                    <div key={tx.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReceiver ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                          <TrendingUpIcon className={`h-4 w-4 ${isReceiver ? '' : 'rotate-180'}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white/80 uppercase">{isReceiver ? 'Received' : 'Sent'}</p>
                          <p className="text-[8px] text-white/30 truncate max-w-[100px] font-mono">
                            {isReceiver ? `From: ${tx.senderPublicKey?.substring(0, 12)}...` : `To: ${tx.receiverPublicKey?.substring(0, 12)}...`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${isReceiver ? 'text-green-400' : 'text-white'}`}>
                          {isReceiver ? '+' : '-'}{tx.amount.toFixed(2)}
                        </p>
                        <p className="text-[8px] text-white/20 font-mono">{tx.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-[10px] text-white/20 italic">No recent activity detected.</p>
                )}
              </div>
            </div>
          );

          return { 
            result: safeJsonStringify({ balance: updatedUser?.ubtBalance || 0, recentTransactions: txs.slice(0, 3) }),
            widget
          };
        }
        case 'send_ubt': {
          const receiver = await api.getUserByPublicKey(args.receiverAddress) || 
                           await api.getUserByEmail(args.receiverAddress) || 
                           await api.getUser(args.receiverAddress);
          
          if (!receiver) throw new Error("Receiver node not found in the protocol registry.");
          
          const widget = (
            <div className="bg-slate-900/90 border border-brand-gold/30 p-6 rounded-[2rem] mt-4 space-y-6 shadow-glow-gold animate-fade-in">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">Confirm Dispatch</p>
                <TrendingUpIcon className="h-5 w-5 text-brand-gold" />
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-white/40 uppercase mb-2">Recipient Node</p>
                  <p className="text-sm font-black text-white">{receiver.name}</p>
                  <code className="text-[8px] font-mono text-brand-gold truncate block mt-1">{receiver.publicKey || 'EXTERNAL_NODE'}</code>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <p className="text-[10px] font-black text-white/40 uppercase">Amount</p>
                  <p className="text-xl font-black text-brand-gold">{args.amount} UBT</p>
                </div>

                <div className="p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl">
                  <p className="text-[9px] text-brand-gold/80 italic">
                    This transaction requires a local cryptographic signature from your node's private key. Once dispatched, it is immutable and will be recorded on the public ledger.
                  </p>
                </div>

                <button 
                  onClick={async () => {
                    try {
                      await api.sendUbt(user, receiver.id, args.amount, args.memo || "Agentic Dispatch");
                      addToast("Transaction dispatched and anchored", "success");
                      setInput("Show me my wallet balance");
                    } catch (err: any) {
                      addToast(err.message, "error");
                    }
                  }}
                  className="w-full py-4 bg-brand-gold text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow-gold active:scale-95 transition-all"
                >
                  Sign & Dispatch
                </button>
              </div>
            </div>
          );

          return { 
            result: `Prepared transaction of ${args.amount} UBT to ${receiver.name} (${receiver.publicKey || 'Node'}). Waiting for user signature.`,
            widget
          };
        }
        case 'search_commons_registry': {
          const results = await api.searchUsers(args.query, user);
          const widget = (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.slice(0, 4).map(r => (
                <div key={r.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-brand-gold/30 transition-all cursor-pointer" onClick={() => onViewProfile(r.id)}>
                  <p className="text-sm font-black text-white">{r.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{r.bio || 'No bio provided'}</p>
                </div>
              ))}
            </div>
          );
          return { 
            result: safeJsonStringify(results.map(r => ({ id: r.id, name: r.name, bio: r.bio }))),
            widget
          };
        }
        case 'get_zim_pulse': {
          const pulse = await new Promise<any[]>((resolve, reject) => {
            const unsub = api.listenForZimPulse((data) => {
              unsub();
              resolve(data);
            }, (err) => {
              unsub();
              reject(err);
            });
          });
          const widget = (
            <div className="space-y-3 mt-4">
              {pulse.slice(0, 3).map(p => (
                <div key={p.id} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{p.type}</span>
                    <span className="text-[9px] text-white/20">{new Date(p.timestamp?.toDate()).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-white/80">{p.content}</p>
                </div>
              ))}
            </div>
          );
          return { 
            result: safeJsonStringify(pulse.slice(0, 5)),
            widget
          };
        }
        case 'get_public_ledger': {
          const txs = await api.getPublicLedger(args.limit || 10);
          const widget = (
            <div className="bg-slate-950/90 border border-brand-gold/40 p-6 rounded-[2rem] mt-4 space-y-6 shadow-glow-gold animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">Global Public Ledger</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Real-time Protocol Activity</p>
                </div>
                <GlobeIcon className="h-5 w-5 text-brand-gold animate-pulse" />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {txs.map(tx => (
                  <div key={tx.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-brand-gold/20 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                          <TrendingUpIcon className="h-3 w-3 text-brand-gold" />
                        </div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{tx.type || 'Transfer'}</p>
                      </div>
                      <p className="text-xs font-black text-brand-gold">{tx.amount.toFixed(2)} UBT</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[8px] font-mono">
                      <div>
                        <p className="text-white/20 uppercase mb-1">Sender Address</p>
                        <p className="text-white/60 truncate">{tx.senderPublicKey || 'GENESIS'}</p>
                      </div>
                      <div>
                        <p className="text-white/20 uppercase mb-1">Receiver Address</p>
                        <p className="text-white/60 truncate">{tx.receiverPublicKey || 'EXTERNAL_NODE'}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <p className="text-[7px] text-white/20 uppercase tracking-widest">Hash: {tx.hash?.substring(0, 24)}...</p>
                        <p className="text-[7px] text-brand-gold/40 font-black uppercase">Verified</p>
                      </div>
                      <p className="text-[6px] text-white/10 uppercase tracking-tighter">Parent: {tx.parentHash?.substring(0, 32)}...</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-[8px] text-center text-white/20 italic">The ledger is public and immutable. All transactions are cryptographically signed and anchored to the Commons Protocol.</p>
            </div>
          );
          return { result: `Displayed the global public ledger with ${txs.length} transactions.`, widget };
        }
        case 'search_zim_pulse': {
          const results = await api.searchZimPulse(args.query, args.location);
          const widget = (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Zim Pulse Matches</p>
              {results.length > 0 ? (
                results.map((item: any, i: number) => (
                  <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-white uppercase">{item.item}</span>
                      <span className="text-xs font-black text-brand-gold">{item.price}</span>
                    </div>
                    <p className="text-[10px] text-white/60">{item.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] font-mono text-white/40">{item.location}</span>
                      <a href={`https://wa.me/${item.sender?.split('@')[0]}`} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-brand-gold hover:underline">Contact Seller</a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 italic">No active matches found in the pulse for this query.</p>
              )}
            </div>
          );
          return { result: `Found ${results.length} matches in the Zim Pulse for "${args.query}".`, widget };
        }
        case 'get_security_status': {
          const hasVault = cryptoService.hasVault();
          const publicKey = cryptoService.getPublicKey();
          const isAnchored = true;
          
          const widget = (
            <div className="bg-slate-900/90 border border-brand-gold/30 p-6 rounded-[2rem] mt-4 space-y-6 shadow-glow-gold animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">Node Security Status</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Cryptographic Identity Anchor</p>
                </div>
                <div className="p-2 rounded-xl border bg-green-500/10 border-green-500/20 text-green-400">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-white/80 uppercase mb-1">Vault Status</p>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">{hasVault ? 'Encrypted & Present' : 'Not Initialized'}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${hasVault ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-white/80 uppercase mb-1">Anchor Status</p>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Node Anchored</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-white/80 uppercase mb-2">Public Key (UBT Address)</p>
                  <code className="text-[9px] font-mono text-brand-gold break-all block bg-black/20 p-2 rounded-lg border border-white/5">
                    {publicKey || 'LOCKED'}
                  </code>
                </div>
              </div>

              <div className="p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl">
                <p className="text-[9px] text-brand-gold/80 leading-relaxed italic">
                  Your node is secured by a non-custodial cryptographic vault. This protocol is reconstructible on any database using your 12-word phrase.
                </p>
              </div>
            </div>
          );
          return { result: `Displayed security status. Anchored: true. Public Key: ${publicKey || 'Locked'}.`, widget };
        }
        case 'get_receive_address': {
          const updatedUser = await api.getUser(user.id);
          const widget = (
            <div className="bg-slate-900/90 border border-brand-gold/30 p-6 rounded-[2rem] mt-4 space-y-4 shadow-glow-gold animate-fade-in">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">Receive Assets</p>
                <GlobeIcon className="h-4 w-4 text-brand-gold" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your Node Public Key</p>
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  <code className="text-[10px] font-mono text-brand-gold truncate flex-1">{updatedUser.publicKey || 'GENESIS_NODE'}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(updatedUser.publicKey || '');
                      addToast("Public key copied to clipboard", "success");
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-[9px] text-white/20 italic">Share this key with other nodes to receive UBT transfers directly to your wallet.</p>
              </div>
            </div>
          );
          return { 
            result: `The user's receive address (public key) is: ${updatedUser.publicKey || 'GENESIS_NODE'}. A widget has been displayed for them to copy it.`,
            widget
          };
        }
        case 'start_simulation': {
          onSwitchView('oracle');
          return { result: `Switching to the Guardian Oracle to simulate: "${args.topic}". Please proceed there to initialize the agents.` };
        }
        case 'spawn_whatsapp_agent': {
          if (user.role !== 'admin') throw new Error("Unauthorized: WhatsApp agent management is restricted to administrators.");
          
          const res = await fetch('/api/whatsapp/instance/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: args.sessionId, forceReset: args.forceReset || false })
          });
          
          if (!res.ok) throw new Error("Failed to spawn WhatsApp agent.");
          
          return { 
            result: `Successfully initiated spawning for WhatsApp agent: ${args.sessionId}. I will now display the network manager so you can scan the QR code if needed.`,
            widget: <WhatsAppManager />
          };
        }
        case 'list_whatsapp_agents': {
          if (user.role !== 'admin') throw new Error("Unauthorized: WhatsApp agent management is restricted to administrators.");
          return { 
            result: "Retrieving active WhatsApp agents from the network...",
            widget: <WhatsAppManager />
          };
        }
        default:
          return { result: `Tool ${name} not implemented yet.` };
      }
    } catch (error: any) {
      return { result: `Error executing tool ${name}: ${error.message}` };
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: AgentMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Trim history to stay within token limits (keep system message + last 15 interactions)
      const systemMessage = messages.find(m => m.role === 'system');
      const otherMessages = messages.filter(m => m.role !== 'system');
      const recentMessages = otherMessages.slice(-15);
      
      const messagesToProcess = systemMessage 
        ? [systemMessage, ...recentMessages, userMessage]
        : [...recentMessages, userMessage];

      let currentMessages = [...messagesToProcess];
      let response = await agentService.chat(currentMessages, TOOLS);
      
      if (!response?.choices?.[0]?.message) {
        throw new Error("The Commons Brain returned an empty response. Please try again.");
      }
      
      let assistantMessage = response.choices[0].message;
      currentMessages.push(assistantMessage);
      setMessages([...currentMessages]);

      // Handle Tool Calls
      if (assistantMessage.tool_calls) {
        const toolMessages: AgentMessage[] = [];
        for (const toolCall of assistantMessage.tool_calls) {
          const { result, widget } = await executeTool(toolCall);
          const toolMessage: AgentMessage = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: result,
            widget
          };
          toolMessages.push(toolMessage);
        }
        
        currentMessages.push(...toolMessages);
        setMessages([...currentMessages]);
        
        // Get final response after tool execution
        const finalResponse = await agentService.chat(currentMessages, TOOLS);
        
        if (!finalResponse?.choices?.[0]?.message) {
          throw new Error("The Commons Brain returned an empty final response. Please try again.");
        }
        
        const finalAssistantMessage = finalResponse.choices[0].message;
        
        // Attach widgets to the final assistant message for rendering
        const finalWithWidgets = {
          ...finalAssistantMessage,
          widgets: toolMessages.filter(m => m.widget).map(m => m.widget)
        };
        
        setMessages([...currentMessages, finalWithWidgets]);
      }
    } catch (error: any) {
      addToast(error.message, 'error');
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered a synchronization error. Please retry your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-slate-900/20 backdrop-blur-3xl z-10">
        <div className="flex items-center gap-4">
          <div className="bg-brand-gold/10 p-2.5 rounded-xl border border-brand-gold/20 relative">
            <SparkleIcon className="h-5 w-5 text-brand-gold" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 bg-green-500"></div>
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight leading-none">UGC Brain</h1>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">
              Node Anchored
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] leading-none mb-1">{(user.ubtBalance || 0).toFixed(2)} UBT</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none mb-1">Protocol Active</p>
            <p className="text-sm font-black text-brand-gold uppercase">{user.name}</p>
          </div>
          <button onClick={onLogout} className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white border border-transparent hover:border-white/10 relative">
            <GlobeIcon className="h-4 w-4" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 bg-green-500"></div>
          </button>
          <button 
            onClick={() => setIsDistressModalOpen(true)} 
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all text-red-500 border border-red-500/20 animate-pulse"
            title="Distress Call"
          >
            <SirenIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {user.role === 'admin' && (
          <div className="flex justify-center gap-4 py-3 bg-slate-900/40 border-b border-white/5 backdrop-blur-xl">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === 'chat' ? 'bg-brand-gold text-slate-950 border-brand-gold shadow-glow-gold' : 'text-white/40 border-white/10 hover:text-white'}`}
            >
              Agentic Brain
            </button>
            <button 
              onClick={() => setActiveTab('network')}
              className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === 'network' ? 'bg-brand-gold text-slate-950 border-brand-gold shadow-glow-gold' : 'text-white/40 border-white/10 hover:text-white'}`}
            >
              WhatsApp Network
            </button>
          </div>
        )}
        
        {activeTab === 'network' ? (
          <div className="h-full overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              <WhatsAppManager />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8">
              {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${msg.role === 'user' ? 'bg-white/5 border-white/10' : 'bg-brand-gold/10 border-brand-gold/20'}`}>
                    {msg.role === 'user' ? <UserCircleIcon className="h-5 w-5 text-white/40" /> : <SparkleIcon className="h-5 w-5 text-brand-gold" />}
                  </div>
                  <div className={`flex-1 space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                      {msg.role === 'user' ? 'Member Node' : 'Commons Brain'}
                    </p>
                    <div className={`pro-card p-5 inline-block max-w-full text-left ${msg.role === 'user' ? 'bg-white/5 border-white/10' : 'bg-slate-900/40 border-white/5 backdrop-blur-sm'}`}>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.widgets && msg.widgets.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {msg.widgets.map((w, i) => (
                            <div key={i}>{w}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 animate-pulse">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                    <LoaderIcon className="h-5 w-5 text-brand-gold animate-spin" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Commons Brain</p>
                    <div className="pro-card p-5 bg-slate-900/40 border-white/5 w-24 h-10 flex items-center justify-center">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-brand-gold rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-brand-gold rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1 h-1 bg-brand-gold rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* WhatsApp Modal */}
          {showWhatsApp && user.role === 'admin' && (
            <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
              <div className="max-w-4xl w-full animate-in fade-in zoom-in duration-300 my-auto">
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={() => setShowWhatsApp(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <WhatsAppManager />
              </div>
            </div>
          )}

          {/* Input Area */}
          <footer className="p-8 border-t border-white/5 bg-slate-900/30 backdrop-blur-2xl">
            <div className="max-w-6xl mx-auto relative">
              <form onSubmit={handleSend} className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !isLoading) {
                        handleSend(e as any);
                      }
                    }
                  }}
                  placeholder="Command the Commons..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-7 px-12 pr-24 text-white text-lg font-medium placeholder:text-white/20 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/20 transition-all shadow-premium resize-none min-h-[100px] max-h-[400px] leading-relaxed"
                  disabled={isLoading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold rounded-2xl border border-brand-gold/20 transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center group shadow-sm"
                >
                  <svg 
                    className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </form>
              <div className="flex gap-6 mt-6 px-6 overflow-x-auto no-scrollbar pb-2">
                 {user.role === 'admin' && (
                   <QuickAction icon={<GlobeIcon className="h-3 w-3 text-emerald-400" />} label="WhatsApp Gateway" onClick={() => setShowWhatsApp(true)} />
                 )}
                 <QuickAction icon={<SparkleIcon className="h-3 w-3 text-brand-gold" />} label="Guardian Oracle" onClick={() => onSwitchView('oracle')} />
                 <QuickAction icon={<WalletIcon className="h-3 w-3" />} label="Wallet Balance" onClick={() => setInput("Show me my wallet balance")} />
                 <QuickAction icon={<GlobeIcon className="h-3 w-3" />} label="Public Ledger" onClick={() => setInput("Show me the public ledger")} />
                 <QuickAction icon={<ShieldCheckIcon className="h-3 w-3 text-brand-gold" />} label="Recovery Anchor" onClick={() => onOpenRecoverySetup?.()} />
                 <QuickAction icon={<ShieldCheckIcon className="h-3 w-3" />} label="Security Status" onClick={() => setInput("Check my node security status")} />
                 <QuickAction icon={<SendIcon className="h-3 w-3" />} label="Send UBT" onClick={() => setInput("I want to send UBT")} />
                 <QuickAction icon={<GlobeIcon className="h-3 w-3" />} label="Receive UBT" onClick={() => setInput("How do I receive UBT?")} />
                 <QuickAction icon={<TrendingUpIcon className="h-3 w-3" />} label="Zim Pulse" onClick={() => setInput("Give me an update on the Zim Pulse.")} />
              </div>
            </div>
          </footer>
        </div>
      )}
    </main>

      <DistressCallModal 
        isOpen={isDistressModalOpen} 
        onClose={() => setIsDistressModalOpen(false)} 
        user={user} 
        onSuccess={() => {
          // User balance/calls count will be updated via AuthContext if implemented there, 
          // or we can manually trigger a refresh if needed.
        }}
      />
    </div>
  );
};

const QuickAction = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 hover:border-white/20 transition-all text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white shadow-sm"
  >
    {icon}
    {label}
  </button>
);
