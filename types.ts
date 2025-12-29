
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'member' | 'agent' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'ousted';
export type FilterType = 'all' | 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress' | 'foryou' | 'following';
export type ProtocolMode = 'MAINNET' | 'TESTNET';
export type AssetType = 'SOL' | 'USDT' | 'USDC';
export type GovernanceTier = 'CITY' | 'NATIONAL' | 'GLOBAL';

export type NavView = 'profile' | 'notifications' | 'sustenance' | 'knowledge' | 'security' | 'state' | 'audit' | 'ledger' | 'wallet' | 'governance';
export type MemberView = NavView | 'home' | 'hub' | 'chats' | 'community' | 'ventures' | 'more' | 'meeting';

export interface Candidate {
    id: string;
    userId: string;
    name: string;
    circle: string;
    tier: GovernanceTier;
    manifesto: string;
    workLinks: string;
    socialLinks: string;
    cvUrl: string;
    voteCount: number;
    votes: string[]; // UIDs of voters
    createdAt: Timestamp;
    status: 'applying' | 'mandated' | 'ordained';
}

export interface ParticipantStatus {
    uid: string;
    name: string;
    isVideoOn: boolean;
    isMicOn: boolean;
    isSpeaking: boolean;
    isRequestingStage: boolean;
    isOnStage: boolean;
    role: string;
    joinedAt: number;
}

export interface Meeting {
    id: string;
    hostId: string;
    hostName: string;
    title: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    participants: { [uid: string]: ParticipantStatus };
    kickedParticipantId?: string;
}

export interface RTCSignal {
    type: 'offer' | 'answer';
    sdp: string;
    from: string;
    to: string;
    timestamp: number;
}

export interface ICESignal {
    candidate: string;
    sdpMLineIndex: number;
    sdpMid: string;
    from: string;
    to: string;
    timestamp: number;
}

export interface PayoutRequest {
    id: string;
    userId: string;
    userName: string;
    type: 'referral' | 'ccap_redemption' | 'veq_redemption' | 'onchain_withdrawal';
    amount: number;
    ecocashName?: string;
    ecocashNumber?: string;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: Timestamp;
    completedAt?: Timestamp;
    processedBy?: {
        adminId: string;
        adminName: string;
    };
    meta?: {
        ccapRedeemed?: number;
        rate?: number;
        ventureId?: string;
        ventureName?: string;
        solanaAddress?: string;
        ubtRedeemed?: number;
    };
}

export interface User {
  id: string;
  name: string;
  name_lowercase?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  circle: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
  isProfileComplete: boolean;
  hasCompletedInduction: boolean;
  referralCode?: string;
  referredBy?: string;
  referrerId?: string;
  conversationIds?: string[];
  phone?: string;
  address?: string;
  bio?: string;
  profession?: string;
  skills?: string[];
  skills_lowercase?: string[];
  interests?: string[];
  passions?: string[];
  awards?: string;
  gender?: string;
  age?: string;
  dob?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  id_card_number?: string;
  knowledgePoints?: number;
  hasReadKnowledgeBase?: boolean;
  scap?: number; 
  ccap?: number; 
  referralEarnings?: number;
  ubtBalance?: number; 
  initialUbtStake?: number;
  fcmToken?: string;
  publicKey?: string;
  vouchCount?: number;
  credibility_score?: number;
  following?: string[];
  followers?: string[];
  lastDailyCheckin?: Timestamp;
  socialLinks?: { title: string; url: string }[];
  pitchDeckTitle?: string;
  pitchDeckSlides?: { title: string; content: string }[];
  ventureEquity?: VentureEquityHolding[];
  sustenanceVouchers?: SustenanceVoucher[];
}

export interface UbtTransaction {
    id: string;
    senderId: string;
    receiverId: string;
    amount: number;
    timestamp: number;
    nonce: string;
    signature: string;
    hash: string;
    senderPublicKey: string;
    parentHash: string;
    priceAtSync?: number; 
    status?: 'pending' | 'verified' | 'failed';
    type?: 'P2P_HANDSHAKE' | 'VOUCH_ANCHOR' | 'REDEMPTION' | 'SYSTEM_MINT' | 'VAULT_SYNC' | 'SIMULATION_MINT' | 'FIAT_BRIDGE' | 'CRYPTO_BRIDGE';
    protocol_mode: ProtocolMode; 
}

export interface Transaction {
    id: string;
    type: 'credit' | 'debit' | 'p2p_sent' | 'p2p_received' | 'amm_swap' | 'liquidation_lock' | 'liquidation_settled' | 'INTERNAL_SYNC';
    amount: number;
    reason: string;
    timestamp: Timestamp;
    actorId: string;
    actorName: string;
    relatedUserId?: string;
    relatedUserName?: string;
    txHash?: string;
}

export interface Agent extends User {
  role: 'agent';
  agent_code: string;
  commissionBalance?: number;
}

export interface MemberUser extends User {
  role: 'member';
  member_id: string;
  credibility_score: number;
  distress_calls_available: number;
  last_distress_call?: Timestamp | null;
  currentCycleCcap?: number;
  lastCycleChoice?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  circle: string;
  registration_amount: number;
  payment_status: 'pending' | 'complete' | 'installment' | 'pending_verification' | 'rejected';
  agent_id: string;
  agent_name: string;
  date_registered: Timestamp;
  welcome_message: string;
  membership_card_id: string;
  uid?: string;
  status?: UserStatus;
  is_duplicate_email?: boolean;
  address?: string;
  national_id?: string;
  skills?: string[];
  interests?: string[];
}

export interface NewMember {
  full_name: string;
  phone: string;
  email: string;
  circle: string;
  registration_amount: number;
  payment_status: 'pending' | 'complete' | 'installment';
}

export interface Broadcast {
    id: string;
    authorId: string;
    authorName: string;
    message: string;
    date: string;
}

export interface Report {
    id: string;
    reporterId: string;
    reporterName: string;
    reportedUserId: string;
    reportedUserName: string;
    reason: string;
    details: string;
    date: string;
    status: 'new' | 'resolved';
    postId?: string;
    postContent?: string;
    postAuthorId?: string;
}

export interface Venture {
    id: string;
    name: string;
    ticker: string;
    description: string;
    ownerId: string;
    ownerName: string;
    fundingGoalUsd: number;
    fundingGoalCcap: number;
    fundingRaisedCcap: number;
    createdAt: Timestamp;
    status: 'fundraising' | 'fully_funded' | 'operational' | 'completed' | 'on_hold' | 'pending_approval';
    backers: string[];
    totalSharesIssued: number;
    totalProfitsDistributed: number;
    pitchDeck: {
        title: string;
        slides: { title: string; content: string }[];
    };
    impactAnalysis: {
        score: number;
        reasoning: string;
    };
}

export interface CommunityValuePool {
    id: string;
    total_usd_value: number;
    total_circulating_ccap: number;
    ccap_to_usd_rate: number;
    last_updated: Timestamp;
}

export interface NewPublicMemberData {
    full_name: string;
    email: string;
    referralCode?: string;
}

export interface Comment {
    id: string;
    parentId: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: Timestamp;
    upvotes: string[];
}

export interface VentureEquityHolding {
    ventureId: string;
    ventureName: string;
    ventureTicker: string;
    shares: number;
}

export interface SustenanceCycle {
    id: string;
    slf_balance: number;
    hamper_cost: number;
    last_drop?: Timestamp;
}

export interface SustenanceVoucher {
    id: string;
    userId: string;
    userName: string;
    value: number;
    status: 'active' | 'redeemed' | 'expired';
    issuedAt: Timestamp;
    expiresAt: Timestamp;
    redeemedBy?: string;
}

export interface RedemptionCycle {
    id: string;
    status: 'window_open' | 'window_closed';
    windowEndDate: Timestamp;
    endDate: Timestamp;
    ccap_to_usd_rate: number;
    cvp_usd_total: number;
    total_ccap_earned: number;
}

export interface UserVault {
    id: string;
    name: string;
    balance: number;
    type: 'FLOAT' | 'LOCKED';
    createdAt: Timestamp;
    lockedUntil?: Timestamp;
}

export interface Distribution {
    id: string;
    ventureId: string;
    totalAmount: number;
    date: Timestamp;
    notes: string;
}

export interface Proposal {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'passed' | 'failed' | 'closed';
    createdAt: Timestamp;
    voteCountFor: number;
    voteCountAgainst: number;
    votesFor: string[];
    votesAgainst: string[];
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorCircle: string;
  authorRole: UserRole;
  content: string;
  date: string;
  upvotes: string[];
  types: 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress';
  commentCount: number;
  repostCount: number;
  isPinned?: boolean;
  requiredSkills?: string[];
  repostedFrom?: any;
}

export interface Conversation {
    id: string;
    members: string[];
    memberNames: { [key: string]: string };
    lastMessage: string;
    lastMessageTimestamp: Timestamp;
    lastMessageSenderId: string;
    readBy: string[];
    isGroup: boolean;
    name?: string;
}

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Timestamp;
    signature?: string; 
    hash?: string;      
    nonce?: string;     
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    link: string;
    read: boolean;
    timestamp: Timestamp;
    type: string;
    causerId?: string;
}

export interface Activity {
    id: string;
    type: string;
    message: string;
    timestamp: Timestamp;
    causerId: string;
    causerName: string;
    causerCircle: string;
    link: string;
}

export type NotificationItem = (Notification | Activity) & { itemType: 'notification' | 'activity' };

export interface PublicUserProfile extends Partial<User> {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    circle: string;
    status: UserStatus;
}

export interface TreasuryVault {
    id: string;
    name: string;
    description: string;
    balance: number;
    publicKey: string;
    type: string;
    isLocked: boolean;
}

export interface CitizenResource {
    id: string;
    name: string;
    type: string;
    circle: string;
    location: string;
    status: string;
    capacity: string;
    managedBy: string;
    createdAt: Timestamp;
    signature: string;
    nonce: string;
    signerKey: string;
}

export interface Dispute {
    id: string;
    claimantId: string;
    claimantName: string;
    respondentId: string;
    respondentName: string;
    reason: string;
    evidence: string;
    status: string;
    juryIds: string[];
    votesForClaimant: number;
    votesForRespondent: number;
    timestamp: Timestamp;
}

export interface GlobalEconomy {
    ubt_to_usd_rate: number;
    cvp_usd_backing: number;
    circulating_ubt: number;
    total_ubt_supply: number;
    last_oracle_sync: Timestamp;
    ubtRedemptionWindowOpen?: boolean;
    ubtRedemptionWindowClosesAt?: Timestamp;
    ubtRedemptionWindowStartedAt?: Timestamp;
}

export interface PendingUbtPurchase {
    id: string;
    userId: string;
    userName: string;
    amountUsd: number;
    amountUbt: number;
    ecocashRef?: string;
    cryptoAsset?: AssetType;
    cryptoAddress?: string;
    payment_method: 'FIAT' | 'CRYPTO';
    status: 'PENDING' | 'AWAITING_CONFIRMATION' | 'VERIFIED' | 'REJECTED';
    createdAt: Timestamp;
}
