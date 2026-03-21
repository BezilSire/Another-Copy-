
import { Timestamp, FieldValue } from 'firebase/firestore';

export type UserRole = 'member' | 'admin';
export type UserStatus = 'active' | 'pending' | 'pending_trust' | 'suspended' | 'ousted';
export type FilterType = 'all' | 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress' | 'foryou' | 'following';
export type ProtocolMode = 'MAINNET' | 'TESTNET';
export type AssetType = 'SOL' | 'USDT' | 'USDC';
export type GovernanceTier = 'CITY' | 'NATIONAL' | 'GLOBAL';

export type MemberView = 'pulse' | 'ledger' | 'vault' | 'wallet' | 'lab' | 'assembly' | 'registry' | 'more' | 'profile' | 'notifications' | 'security' | 'audit' | 'knowledge' | 'community' | 'governance' | 'state' | 'sustenance' | 'home' | 'hub';

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
  initialUbtStake?: number;
  sustenanceVouchers?: SustenanceVoucher[];
  recoveryCommitment?: string;
  isKeyRotated?: boolean;
}

// Fixed: Added Admin interface extending User
export interface Admin extends User {
    role: 'admin';
}

export interface Block {
    id: string;
    index: number;
    timestamp: number;
    transactions: UbtTransaction[];
    merkleRoot: string;
    previousHash: string;
    nonce: number;
    hash: string;
    minerId: string;
    difficulty: number;
    serverTimestamp?: Timestamp;
}

export interface UbtTransaction {
    id: string;
    senderId: string;
    receiverId: string;
    amount: number;
    fee?: number;
    timestamp: number | Timestamp | FieldValue;
    nonce: string;
    signature: string;
    hash: string;
    senderPublicKey: string;
    receiverPublicKey?: string; // Stamped for the Public Explorer
    parentHash: string;
    priceAtSync?: number; 
    status?: 'pending' | 'verified' | 'failed';
    type?: 'P2P_HANDSHAKE' | 'VOUCH_ANCHOR' | 'REDEMPTION' | 'SYSTEM_MINT' | 'VAULT_SYNC' | 'FIAT_BRIDGE' | 'INTENT_PRIME' | 'SIMULATION_MINT' | 'TRANSFER' | 'credit' | 'debit' | 'COINBASE';
    protocol_mode: ProtocolMode; 
    reason?: string;
    serverTimestamp?: Timestamp;
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

export interface NewPublicMemberData {
    full_name: string;
    email: string;
    referralCode?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
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

export interface ZimNews {
    id: string;
    title: string;
    content: string;
    source: string;
    url: string;
    timestamp: Timestamp;
    category: 'economy' | 'agriculture' | 'tech' | 'social' | 'general';
    sentiment: 'positive' | 'neutral' | 'negative';
    vouchCount: number;
    vouchedBy: string[];
}

export interface Simulation {
    id: string;
    userId: string;
    title: string;
    seedMaterial: string;
    status: 'initializing' | 'simulating' | 'completed' | 'failed';
    createdAt: Timestamp;
    completedAt?: Timestamp;
    prediction?: string;
    profitStrategy?: string;
    confidenceScore: number;
    agentCount: number;
}

export interface SimAgent {
    id: string;
    simulationId: string;
    name: string;
    persona: string;
    background: string;
    initialStance: string;
    currentStance: string;
    avatarUrl?: string;
}

export interface SimMessage {
    id: string;
    simulationId: string;
    agentId: string;
    agentName: string;
    content: string;
    timestamp: Timestamp;
    platform: 'ZIM_X' | 'ZIM_REDDIT';
}

export interface AgenticTask {
    id: string;
    userId: string;
    description: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: string;
    createdAt: Timestamp;
    completedAt?: Timestamp;
    toolsUsed: string[];
}

export interface DistressCall {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    message: string;
    status: 'pending' | 'resolved' | 'dismissed';
    timestamp: Timestamp;
    location?: {
        latitude: number;
        longitude: number;
    };
}


