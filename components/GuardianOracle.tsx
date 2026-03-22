
import React, { useState, useEffect, useRef } from 'react';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp, 
    doc, 
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { getDbInstance } from '../services/firebase';
import { User, Simulation, SimAgent, SimMessage } from '../types';
import { simulationService } from '../services/simulationService';
import { api, OperationType } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { 
    MessageSquare, 
    Play, 
    Plus, 
    TrendingUp, 
    ShieldCheck, 
    Loader, 
    User as UserIcon, 
    Zap, 
    ChevronRight, 
    ArrowRight, 
    AlertCircle, 
    CheckCircle, 
    Info, 
    Terminal, 
    Database, 
    Globe, 
    Cpu, 
    Activity, 
    BarChart3, 
    DollarSign, 
    PieChart, 
    Users, 
    Search, 
    FileText, 
    Settings, 
    X, 
    Maximize2, 
    Minimize2, 
    RefreshCw, 
    Share2, 
    Download, 
    Trash2, 
    MoreVertical, 
    Send, 
    Mic, 
    Image as ImageIcon, 
    Paperclip, 
    Smile, 
    Lock, 
    Unlock, 
    Eye, 
    EyeOff, 
    Star, 
    Heart, 
    Bookmark, 
    Flag, 
    Edit3, 
    Copy, 
    ExternalLink, 
    Clock, 
    Calendar, 
    MapPin, 
    Link, 
    Mail, 
    Phone, 
    Hash, 
    AtSign, 
    Briefcase, 
    GraduationCap, 
    Award, 
    Target, 
    Compass, 
    Layers, 
    Box, 
    Package, 
    Truck, 
    ShoppingCart, 
    CreditCard, 
    Wallet, 
    Banknote, 
    Coins, 
    Gem, 
    Trophy, 
    Medal, 
    Flame, 
    Sun, 
    Moon, 
    Cloud, 
    Snowflake, 
    Umbrella, 
    Coffee, 
    Utensils, 
    Pizza, 
    Beer, 
    Wine, 
    GlassWater, 
    Music, 
    Headphones, 
    Mic2, 
    Speaker, 
    Video, 
    Camera, 
    Film, 
    Tv, 
    Monitor, 
    Smartphone, 
    Tablet, 
    Laptop, 
    Watch, 
    Printer, 
    Keyboard, 
    Mouse, 
    HardDrive, 
    Wifi, 
    Bluetooth, 
    Battery, 
    BatteryCharging, 
    BatteryFull, 
    BatteryLow, 
    BatteryMedium, 
    BatteryWarning, 
    Plug, 
    Power, 
    Settings2, 
    Sliders, 
    ToggleLeft, 
    ToggleRight, 
    Check, 
    Circle, 
    Square, 
    Triangle, 
    Pentagon, 
    Hexagon, 
    Octagon, 
    StarHalf, 
    StarOff, 
    HeartOff, 
    Bell, 
    BellOff, 
    BellRing, 
    SearchCode, 
    SearchCheck, 
    SearchX, 
    Filter, 
    SortAsc, 
    SortDesc, 
    Menu, 
    XCircle, 
    XSquare, 
    CheckCircle2, 
    CheckSquare, 
    AlertTriangle, 
    AlertOctagon, 
    HelpCircle, 
    History, 
    Undo, 
    Redo, 
    RotateCcw, 
    RotateCw, 
    ZoomIn, 
    ZoomOut, 
    Move, 
    Hand, 
    Pointer, 
    Grab, 
    Scaling, 
    Rotate3d, 
    FlipHorizontal, 
    FlipVertical, 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    AlignJustify, 
    Bold, 
    Italic, 
    Underline, 
    Strikethrough, 
    List, 
    ListOrdered, 
    Quote, 
    Code, 
    Table, 
    Columns, 
    Rows, 
    Grid, 
    Layout, 
    PanelLeft, 
    PanelRight, 
    PanelTop, 
    PanelBottom, 
    Maximize, 
    Minimize, 
    Volume, 
    Volume1, 
    Volume2, 
    VolumeX, 
    PlayCircle, 
    PauseCircle, 
    StopCircle, 
    SkipBack, 
    SkipForward, 
    FastForward, 
    Rewind, 
    Repeat, 
    Shuffle, 
    Repeat1, 
    MicOff, 
    VideoOff, 
    CameraOff, 
    MonitorOff, 
    WifiOff, 
    BluetoothOff, 
    PowerOff, 
    Shield, 
    ShieldOff, 
    ShieldAlert, 
    Key, 
    Fingerprint, 
    Scan, 
    ScanFace, 
    ScanBarcode, 
    ScanQrCode, 
    QrCode, 
    Barcode, 
    Nfc, 
    Rss, 
    Cast, 
    Airplay, 
    Cpu as Cpu2, 
    Fan, 
    Server, 
    Scale
} from 'lucide-react';

interface GuardianOracleProps {
    user: User;
    onBack: () => void;
}

export const GuardianOracle: React.FC<GuardianOracleProps> = ({ user, onBack }) => {
    const db = getDbInstance();
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [activeSimId, setActiveSimId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SimMessage[]>([]);
    const [agents, setAgents] = useState<SimAgent[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newSim, setNewSim] = useState({ title: '', seedMaterial: '' });
    const [oracleChat, setOracleChat] = useState<{ role: 'user' | 'oracle', content: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState<'feed' | 'oracle' | 'strategy'>('feed');
    const { addToast } = useToast();
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user?.id || !db) return;

        const q = query(
            collection(db, 'simulations'),
            where('userId', '==', user.id),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(q, (snap) => {
            setSimulations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Simulation)));
        }, (e) => api.handleFirestoreError(e, OperationType.LIST, 'simulations'));
    }, [user.id]);

    useEffect(() => {
        if (!activeSimId || !db) return;

        const agentsQ = collection(db, `simulations/${activeSimId}/agents`);
        const messagesQ = query(
            collection(db, `simulations/${activeSimId}/messages`),
            orderBy('timestamp', 'asc')
        );

        const unsubAgents = onSnapshot(agentsQ, (snap) => {
            setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() } as SimAgent)));
        }, (e) => api.handleFirestoreError(e, OperationType.LIST, `simulations/${activeSimId}/agents`));

        const unsubMessages = onSnapshot(messagesQ, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as SimMessage)));
        }, (e) => api.handleFirestoreError(e, OperationType.LIST, `simulations/${activeSimId}/messages`));

        return () => {
            unsubAgents();
            unsubMessages();
        };
    }, [activeSimId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, oracleChat]);

    const handleCreateSim = async () => {
        if (!newSim.title || !newSim.seedMaterial) {
            addToast("Please provide a title and seed material.", "error");
            return;
        }

        setIsCreating(true);
        try {
            const simId = await simulationService.initializeSimulation(user, newSim.title, newSim.seedMaterial);
            setActiveSimId(simId);
            setIsCreating(false);
            setNewSim({ title: '', seedMaterial: '' });
            addToast("Simulation Initialized. Agents are entering the environment.", "success");
        } catch (error) {
            addToast("Failed to initialize simulation.", "error");
            setIsCreating(false);
        }
    };

    const runStep = async () => {
        if (!activeSimId) return;
        setIsSimulating(true);
        try {
            await simulationService.runSimulationStep(activeSimId);
        } catch (error) {
            addToast("Simulation step failed.", "error");
        } finally {
            setIsSimulating(false);
        }
    };

    const generateReport = async () => {
        if (!activeSimId) return;
        setIsSimulating(true);
        try {
            await simulationService.generateFinalReport(activeSimId);
            addToast("Oracle Prediction Generated.", "success");
            setActiveTab('strategy');
        } catch (error) {
            addToast("Failed to generate report.", "error");
        } finally {
            setIsSimulating(false);
        }
    };

    const handleOracleChat = async () => {
        if (!userInput || !activeSimId) return;
        const msg = userInput;
        setUserInput('');
        setOracleChat(prev => [...prev, { role: 'user', content: msg }]);
        
        try {
            const response = await simulationService.chatWithOracle(activeSimId, msg);
            setOracleChat(prev => [...prev, { role: 'oracle', content: response }]);
        } catch (error) {
            addToast("Oracle is currently offline.", "error");
        }
    };

    const activeSim = simulations.find(s => s.id === activeSimId);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-4 sm:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white group"
                    >
                        <ArrowRight className="h-5 w-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter gold-text">Guardian Oracle</h1>
                        <p className="label-caps !text-[10px] text-gray-500">Social Digital Twin & Market Prediction Engine</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="module-frame glass-module px-6 py-3 rounded-2xl border-brand-gold/30 hover:border-brand-gold transition-all flex items-center gap-3 group"
                >
                    <Plus className="h-4 w-4 text-brand-gold group-hover:rotate-90 transition-transform" />
                    <span className="label-caps !text-[12px]">New Simulation</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar: Simulations List */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="module-frame glass-module p-6 rounded-[2rem] border-white/5 space-y-6">
                        <h2 className="label-caps !text-[10px]">Active Simulations</h2>
                        <div className="space-y-3">
                            {simulations.map(sim => (
                                <button 
                                    key={sim.id}
                                    onClick={() => setActiveSimId(sim.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                        activeSimId === sim.id 
                                        ? 'bg-brand-gold/10 border-brand-gold/50' 
                                        : 'bg-black/40 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <p className="text-xs font-bold uppercase truncate">{sim.title}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full ${
                                            sim.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-brand-gold/20 text-brand-gold'
                                        }`}>
                                            {sim.status}
                                        </span>
                                        <span className="text-[8px] text-gray-500">{sim.createdAt instanceof Timestamp ? sim.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                                    </div>
                                </button>
                            ))}
                            {simulations.length === 0 && (
                                <div className="text-center py-10 opacity-30">
                                    <Database className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-[10px] uppercase">No simulations found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agents List */}
                    {activeSimId && (
                        <div className="module-frame glass-module p-6 rounded-[2rem] border-white/5 space-y-6">
                            <h2 className="label-caps !text-[10px]">Simulated Agents ({agents.length})</h2>
                            <div className="space-y-3">
                                {agents.map(agent => (
                                    <div key={agent.id} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                                        <div className="h-8 w-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                                            <UserIcon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase truncate">{agent.name}</p>
                                            <p className="text-[8px] text-gray-500 truncate">{agent.initialStance}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content: Chat / Feed */}
                <div className="lg:col-span-9 space-y-6">
                    {!activeSimId ? (
                        <div className="h-[600px] flex flex-col items-center justify-center module-frame glass-module rounded-[3rem] border-white/5 opacity-50">
                            <Zap className="h-16 w-16 text-brand-gold mb-6 animate-pulse" />
                            <h2 className="text-xl font-black uppercase tracking-widest">Select or Create a Simulation</h2>
                            <p className="label-caps !text-[10px] mt-2">The Oracle awaits your seed material</p>
                        </div>
                    ) : (
                        <div className="module-frame glass-module rounded-[3rem] border-white/5 overflow-hidden flex flex-col h-[700px]">
                            {/* Tabs */}
                            <div className="flex border-b border-white/5">
                                <button 
                                    onClick={() => setActiveTab('feed')}
                                    className={`flex-1 py-4 label-caps !text-[10px] transition-all ${activeTab === 'feed' ? 'bg-brand-gold/10 text-brand-gold' : 'hover:bg-white/5'}`}
                                >
                                    Simulation Feed
                                </button>
                                <button 
                                    onClick={() => setActiveTab('strategy')}
                                    className={`flex-1 py-4 label-caps !text-[10px] transition-all ${activeTab === 'strategy' ? 'bg-brand-gold/10 text-brand-gold' : 'hover:bg-white/5'}`}
                                >
                                    Profit Strategy
                                </button>
                                <button 
                                    onClick={() => setActiveTab('oracle')}
                                    className={`flex-1 py-4 label-caps !text-[10px] transition-all ${activeTab === 'oracle' ? 'bg-brand-gold/10 text-brand-gold' : 'hover:bg-white/5'}`}
                                >
                                    Chat with Oracle
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                {activeTab === 'feed' && (
                                    <div className="space-y-6">
                                        {messages.map(msg => (
                                            <div key={msg.id} className="flex gap-4 animate-fade-in">
                                                <div className="h-10 w-10 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center border border-white/10">
                                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <div className="space-y-1 max-w-2xl">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase text-brand-gold">{msg.agentName}</span>
                                                        <span className="text-[8px] text-gray-600 uppercase tracking-widest">{msg.platform}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-4 rounded-2xl rounded-tl-none border border-white/5 text-sm leading-relaxed text-gray-300">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {messages.length === 0 && (
                                            <div className="text-center py-20 opacity-30">
                                                <Terminal className="h-12 w-12 mx-auto mb-4" />
                                                <p className="label-caps !text-[12px]">Simulation environment initialized. Run step to begin.</p>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                )}

                                {activeTab === 'strategy' && (
                                    <div className="space-y-10 animate-fade-in">
                                        {activeSim?.status === 'completed' ? (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="p-6 bg-brand-gold/5 rounded-3xl border border-brand-gold/20">
                                                        <p className="label-caps !text-[8px] text-brand-gold mb-2">Confidence Score</p>
                                                        <p className="text-4xl font-black">{activeSim.confidenceScore}%</p>
                                                    </div>
                                                    <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                                                        <p className="label-caps !text-[8px] text-emerald-500 mb-2">Market Sentiment</p>
                                                        <p className="text-4xl font-black">STABLE</p>
                                                    </div>
                                                    <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/20">
                                                        <p className="label-caps !text-[8px] text-blue-500 mb-2">Profit Window</p>
                                                        <p className="text-4xl font-black">48H</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5">
                                                        <h3 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-3">
                                                            <TrendingUp className="h-5 w-5 text-brand-gold" />
                                                            The Prediction
                                                        </h3>
                                                        <p className="text-gray-400 leading-loose">{activeSim.prediction}</p>
                                                    </div>

                                                    <div className="module-frame glass-module p-8 rounded-[2.5rem] border-brand-gold/20 bg-brand-gold/5">
                                                        <h3 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-3">
                                                            <DollarSign className="h-5 w-5 text-brand-gold" />
                                                            Profit Strategy
                                                        </h3>
                                                        <div className="prose prose-invert max-w-none">
                                                            <p className="text-white leading-loose whitespace-pre-wrap">{activeSim.profitStrategy}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-20 opacity-30">
                                                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                                                <p className="label-caps !text-[12px]">Run simulation and generate report to see strategy.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'oracle' && (
                                    <div className="flex flex-col h-full">
                                        <div className="flex-1 space-y-6">
                                            {oracleChat.map((chat, i) => (
                                                <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] p-5 rounded-3xl ${
                                                        chat.role === 'user' 
                                                        ? 'bg-brand-gold/20 border border-brand-gold/30 rounded-tr-none' 
                                                        : 'bg-black/60 border border-white/5 rounded-tl-none'
                                                    }`}>
                                                        <p className="text-sm leading-relaxed">{chat.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {oracleChat.length === 0 && (
                                                <div className="text-center py-20 opacity-30">
                                                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                                                    <p className="label-caps !text-[12px]">Ask the Oracle about the simulation results.</p>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="p-6 bg-black/60 border-t border-white/5">
                                {activeTab === 'oracle' ? (
                                    <div className="flex gap-4">
                                        <input 
                                            type="text" 
                                            value={userInput}
                                            onChange={e => setUserInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleOracleChat()}
                                            placeholder="Ask the Oracle..."
                                            className="flex-1 bg-slate-900 border border-white/10 p-4 rounded-2xl text-sm focus:border-brand-gold outline-none transition-all"
                                        />
                                        <button 
                                            onClick={handleOracleChat}
                                            className="p-4 bg-brand-gold text-black rounded-2xl hover:bg-brand-gold/80 transition-all"
                                        >
                                            <Send className="h-5 w-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-4">
                                        <button 
                                            onClick={runStep}
                                            disabled={isSimulating || activeSim?.status === 'completed'}
                                            className="flex-1 px-6 py-4 bg-brand-gold/10 border border-brand-gold/30 rounded-2xl label-caps !text-[10px] text-brand-gold hover:bg-brand-gold/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                                        >
                                            {isSimulating ? <Loader className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                            Run Simulation Step
                                        </button>
                                        <button 
                                            onClick={generateReport}
                                            disabled={isSimulating || messages.length < 3 || activeSim?.status === 'completed'}
                                            className="flex-1 px-6 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl label-caps !text-[10px] text-emerald-500 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            Generate Oracle Report
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Simulation Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                    <div className="module-frame glass-module p-10 rounded-[3.5rem] border-brand-gold/30 shadow-glow-gold max-w-2xl w-full space-y-10 relative">
                        <button onClick={() => setIsCreating(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                        
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black uppercase tracking-tighter gold-text">Initialize Simulation</h2>
                            <p className="label-caps !text-[10px] text-gray-500">Provide the seed material for the Oracle to simulate</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Simulation Title</label>
                                <input 
                                    type="text" 
                                    value={newSim.title}
                                    onChange={e => setNewSim({...newSim, title: e.target.value})}
                                    placeholder="e.g., Harare Maize Price Volatility"
                                    className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-black text-[11px] uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Seed Material (Context, News, Data)</label>
                                <textarea 
                                    value={newSim.seedMaterial}
                                    onChange={e => setNewSim({...newSim, seedMaterial: e.target.value})}
                                    placeholder="Paste news articles, market reports, or rumors here..."
                                    className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white text-xs leading-relaxed h-48 outline-none focus:border-brand-gold transition-all"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateSim}
                            disabled={isCreating}
                            className="w-full py-6 bg-brand-gold text-black font-black uppercase tracking-widest rounded-3xl hover:bg-brand-gold/80 transition-all flex items-center justify-center gap-4"
                        >
                            {isCreating ? <Loader className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                            Ignite Simulation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
