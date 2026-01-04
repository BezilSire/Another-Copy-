
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'member' | 'agent' | 'admin';
export type UserStatus = 'active' | 'pending' | 'pending_trust' | 'suspended' | 'ousted';
export type FilterType = 'all' | 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress' | 'foryou' | 'following';
export type ProtocolMode = 'MAINNET' | 'TESTNET';
export type AssetType = 'SOL' | 'USDT' | 'USDC';
export type GovernanceTier = 'CITY' | 'NATIONAL' | 'GLOBAL';

export type MemberView = 'pulse' | 'ledger' | 'vault' | 'lab' | 'assembly' | 'registry' | 'more' | 'profile' | 'notifications' | 'security' | 'audit' | 'knowledge' | 'chats' | 'community' | 'governance' | 'meeting' | 'state' | 'sustenance' | 'home' | 'hub';

// Fixed: Added missing NavView type alias used in MorePage.tsx
export type NavView = MemberView;

export interface TreasuryVault {
    id: string;
    name: string;
    description: string;
    balance: number;
    publicKey: string;
    type: 'GENESIS' | 'FLOAT' | 'SUSTENANCE' | 'DISTRESS' | 'VENTURE';
    isLocked: boolean;
}

// Fixed: Added missing properties to User interface to satisfy various component and service requirements
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
  ubtBalance?: number; 
  publicKey?: string;
  vouchCount?: number;
  credibility_score?: number;
  member_id?: string;
  phone?: string;
  address?: string;
  bio?: string;
  profession?: string;
  skills?: string[];
  interests?: string[];
  passions?: string[];
  gender?: string;
  age?: string;
  following?: string[];
  followers?: string[];
  fcmToken?: string;
  scap?: number;
  ccap?: number;
  lastDailyCheckin?: Timestamp;
  referralCode?: string;
  referredBy?: string;
  referrerId?: string;
  referralEarnings?: number;
  distress_calls_available: number;
  hasReadKnowledgeBase?: boolean;
  knowledgePoints?: number;
  ventureEquity?: VentureEquityHolding[];
  awards?: string;
  socialLinks?: { title: string; url: string }[];
  intents?: IntentRule[];
  pitchDeckTitle?: string;
  pitchDeckSlides?: { title: string; content: string }[];
  businessIdea?: string;
  lookingFor?: string[];
  dob?: string;
  /* Added id_card_number to satisfy profile completion components */
  id_card_number?: string;
}

// Fixed: Added Admin and Agent interfaces extending User
export interface Admin extends User {
    role: 'admin';
}

export interface Agent extends User {
    role: 'agent';
    agent_code: string;
    commissionBalance?: number;
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
    receiverPublicKey?: string; // Stamped for the Public Explorer
    parentHash: string;
    priceAtSync?: number; 
    status?: 'pending' | 'verified' | 'failed';
    type?: 'P2P_HANDSHAKE' | 'VOUCH_ANCHOR' | 'REDEMPTION' | 'SYSTEM_MINT' | 'VAULT_SYNC' | 'FIAT_BRIDGE' | 'INTENT_PRIME' | 'SIMULATION_MINT' | 'credit' | 'debit';
    protocol_mode: ProtocolMode; 
    reason?: string;
}

export interface GlobalEconomy {
    ubt_to_usd_rate: number;
    cvp_usd_backing: number;
    circulating_ubt: number;
    total_ubt_supply: number;
    last_oracle_sync: Timestamp;
    ubtRedemptionWindowOpen?: boolean;
    ubtRedemptionWindowStartedAt?: Timestamp;
    ubtRedemptionWindowClosesAt?: Timestamp;
}

// Fixed: Added missing properties to PendingUbtPurchase to support crypto payments and verification status
export interface PendingUbtPurchase {
    id: string;
    userId: string;
    userName: string;
    amountUsd: number;
    amountUbt: number;
    ecocashRef?: string;
    payment_method: 'FIAT' | 'CRYPTO';
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'AWAITING_CONFIRMATION';
    createdAt: Timestamp;
    cryptoAsset?: AssetType;
    cryptoAddress?: string;
    verifiedAt?: Timestamp;
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

// Fixed: Added signature, hash, and nonce to Message interface
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

// Fixed: Added causerId to Notification interface
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

export interface Candidate {
    id: string;
    userId: string;
    name: string;
    circle: string;
    tier: GovernanceTier;
    manifesto: string;
    voteCount: number;
    votes: string[];
    createdAt: Timestamp;
    status: 'applying' | 'mandated' | 'ordained';
    cvUrl: string;
    workLinks?: string;
    socialLinks?: string;
}

export interface CitizenResource {
    id: string;
    name: string;
    type: 'LAND' | 'WATER' | 'ENERGY' | 'FOOD' | 'EQUIPMENT';
    circle: string;
    location: string;
    status: 'OPTIMAL' | 'DEGRADED';
    capacity: string;
    managedBy: string;
    signature: string;
    nonce?: string;
    signerKey?: string;
}

export interface Dispute {
    id: string;
    claimantId: string;
    claimantName: string;
    respondentId: string;
    respondentName: string;
    reason: string;
    status: 'TRIBUNAL' | 'RESOLVED';
    juryIds: string[];
    votesForClaimant: number;
    votesForRespondent: number;
    evidence?: string;
}

export interface MultiSigProposal {
    id: string;
    fromVaultId: string;
    toVaultId: string;
    amount: number;
    reason: string;
    proposerId: string;
    proposerName: string;
    signatures: string[];
    status: 'pending' | 'executed' | 'rejected';
    timestamp: Timestamp;
}

export interface PublicUserProfile extends Partial<User> {
    id: string;
    name: string;
}

// Fixed: Added missing NewMember interface used by Agent functions
export interface NewMember {
    full_name: string;
    email: string;
    phone: string;
    circle: string;
    registration_amount: number;
    payment_status: 'complete' | 'installment' | 'pending_verification' | 'rejected';
}

// Fixed: Added missing properties to Member interface
export interface Member extends User {
    full_name: string;
    membership_card_id: string;
    payment_status: 'complete' | 'installment' | 'pending_verification' | 'rejected';
    registration_amount: number;
    agent_id: string;
    agent_name: string;
    date_registered: Timestamp | string;
    welcome_message: string;
    is_duplicate_email?: boolean;
    uid?: string;
    national_id?: string;
}

export interface MemberUser extends User {
    currentCycleCcap?: number;
    lastCycleChoice?: 'REDEEM' | 'STAKE' | 'INVEST';
}

export interface PayoutRequest {
    id: string;
    userId: string;
    userName: string;
    type: 'referral' | 'ccap_redemption' | 'veq_redemption' | 'onchain_withdrawal';
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: Timestamp;
    ecocashName?: string;
    ecocashNumber?: string;
    completedAt?: Timestamp;
    processedBy?: { adminId: string; adminName: string };
    meta?: any;
}

export interface CommunityValuePool {
    id: string;
    total_usd_value: number;
    total_circulating_ccap: number;
    ccap_to_usd_rate: number;
    cvp_usd_total: number;
    total_ccap_earned: number;
}

// Fixed: Added link to Activity interface
export interface Activity {
    id: string;
    type: 'NEW_MEMBER' | 'NEW_POST_PROPOSAL' | 'NEW_POST_OPPORTUNITY' | 'NEW_POST_OFFER' | 'NEW_POST_GENERAL' | 'POST_LIKE' | 'NEW_FOLLOWER';
    message: string;
    timestamp: Timestamp;
    causerId: string;
    causerName: string;
    causerCircle: string;
    link?: string;
}

export type NotificationItem = (Notification | Activity) & { itemType: 'notification' | 'activity' };

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

// Fixed: Added ticker and pitchDeck to Venture interface
export interface Venture {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    ownerName: string;
    fundingGoalUsd: number;
    fundingGoalCcap: number;
    fundingRaisedCcap: number;
    backers: string[];
    status: 'fundraising' | 'operational' | 'fully_funded' | 'completed' | 'on_hold';
    createdAt: Timestamp;
    totalSharesIssued: number;
    totalProfitsDistributed: number;
    impactAnalysis: { score: number; reasoning: string };
    ticker: string;
    pitchDeck?: any;
}

export interface SustenanceCycle {
    id: string;
    slf_balance: number;
    hamper_cost: number;
    last_drop: Timestamp;
}

// Fixed: Added parentId to Comment interface
export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: Timestamp;
    upvotes: string[];
    parentId: string;
}

export interface Distribution {
    id: string;
    ventureId: string;
    totalAmount: number;
    date: Timestamp;
    notes: string;
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
    type: 'HOT' | 'LOCKED';
    createdAt: Timestamp;
}

// Fixed: Added validatorIds to IntentRule interface
export interface IntentRule {
    id: string;
    triggerType: 'TENSION_SPIKE' | 'PEER_REQUEST' | 'TIME_ELAPSED';
    threshold: number;
    actionAmount: number;
    status: 'watching' | 'executed';
    validatorIds?: string[];
}

export interface SustenanceVoucher {
    id: string;
    value: number;
    status: 'active' | 'redeemed';
    issuedAt: Timestamp;
    expiresAt: Timestamp;
    userName?: string;
    redeemedBy?: string;
}

export interface VentureEquityHolding {
    ventureId: string;
    ventureName: string;
    ventureTicker: string;
    shares: number;
}

export interface Broadcast {
    id: string;
    message: string;
    date: string;
}

export interface Report {
    id: string;
    reason: string;
    details: string;
    status: 'new' | 'resolved';
    reportedUserName: string;
    reportedUserId: string;
    date: string;
    reporterId: string;
    reporterName: string;
    postContent?: string;
    postId?: string;
    postAuthorId?: string;
}

export interface ParticipantStatus {
    uid: string;
    name: string;
    isVideoOn: boolean;
    isMicOn: boolean;
    joinedAt: number;
    isOnStage: boolean;
    isRequestingStage: boolean;
    role: string;
    isSpeaking: boolean;
}

export interface Meeting {
    id: string;
    title: string;
    expiresAt: Timestamp;
    hostId: string;
    participants: Record<string, ParticipantStatus>;
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
    from: string;
    to: string;
    timestamp: number;
    sdpMLineIndex?: number;
    sdpMid?: string;
}

// Fixed: Added missing NewPublicMemberData interface
export interface NewPublicMemberData {
    full_name: string;
    email: string;
    referralCode?: string;
}

// Fixed: Added missing Post interface
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
    requiredSkills?: string[];
    commentCount: number;
    repostCount: number;
    ccapAwarded?: number;
    isPinned?: boolean;
    repostedFrom?: Post;
}

// Fixed: Added Transaction type alias for backward compatibility
export type Transaction = UbtTransaction;
