import { Timestamp } from 'firebase/firestore';

export type UserRole = 'member' | 'agent' | 'admin';
export type UserStatus = 'active' | 'pending' | 'pending_trust' | 'suspended' | 'ousted';
export type FilterType = 'all' | 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress' | 'foryou' | 'following';
export type ProtocolMode = 'MAINNET' | 'TESTNET';
export type AssetType = 'SOL' | 'USDT' | 'USDC';
export type GovernanceTier = 'CITY' | 'NATIONAL' | 'GLOBAL';

export type MemberView = 'pulse' | 'ledger' | 'vault' | 'lab' | 'assembly' | 'registry' | 'more' | 'profile' | 'notifications' | 'security' | 'audit' | 'knowledge' | 'chats' | 'community' | 'governance' | 'meeting' | 'state' | 'sustenance' | 'home' | 'hub';

// --- INTENT ENGINE ---
export type IntentStatus = 'watching' | 'primed' | 'executed' | 'paused';
export interface IntentRule {
    id: string;
    triggerType: 'TENSION_SPIKE' | 'PEER_REQUEST' | 'TIME_ELAPSED' | 'FOOD_SECURITY';
    threshold: number;
    actionAmount: number;
    validatorIds: string[];
    status: IntentStatus;
}

// --- TREASURY NODES ---
export type VaultType = 'GENESIS' | 'FLOAT' | 'SUSTENANCE' | 'DISTRESS' | 'VENTURE';

export interface TreasuryVault {
    id: string;
    name: string;
    description: string;
    balance: number;
    publicKey: string;
    type: VaultType;
    isLocked: boolean;
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
  id_card_number?: string;
  knowledgePoints?: number;
  hasReadKnowledgeBase?: boolean;
  scap?: number; 
  ccap?: number; 
  ubtBalance?: number; 
  initialUbtStake?: number;
  publicKey?: string;
  vouchCount?: number;
  credibility_score?: number;
  resonance_score?: number;
  intents?: IntentRule[];
  following?: string[];
  followers?: string[];
  lastDailyCheckin?: Timestamp;
  ventureEquity?: VentureEquityHolding[];
  sustenanceVouchers?: SustenanceVoucher[];
  fcmToken?: string;
  member_id?: string;
  distress_calls_available?: number;
  interests?: string[];
  passions?: string[];
  awards?: string;
  gender?: string;
  age?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  pitchDeckTitle?: string;
  pitchDeckSlides?: any[];
  socialLinks?: { title: string; url: string }[];
  dob?: string;
}

export interface Agent extends User {
    agent_code: string;
    commissionBalance: number;
    referralEarnings: number;
}

export interface Admin extends User {}

export interface MemberUser extends User {
    currentCycleCcap?: number;
    lastCycleChoice?: 'REDEEM' | 'STAKE' | 'INVEST';
}

export interface PublicUserProfile extends Partial<User> {
    id: string;
    name: string;
}

export interface Member {
    id: string;
    full_name: string;
    email: string;
    uid?: string;
    agent_id: string;
    agent_name: string;
    date_registered: Timestamp | string;
    payment_status: 'pending' | 'complete' | 'installment' | 'pending_verification' | 'rejected';
    registration_amount: number;
    welcome_message: string;
    membership_card_id: string;
    phone: string;
    circle: string;
    is_duplicate_email?: boolean;
    status?: UserStatus;
    national_id?: string;
    address?: string;
    skills?: string[];
    interests?: string[];
}

export interface NewMember {
    full_name: string;
    phone: string;
    email: string;
    circle: string;
    registration_amount: number;
    payment_status: 'complete' | 'installment';
}

export interface NewPublicMemberData {
    full_name: string;
    email: string;
    referralCode?: string;
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
    processedBy?: { adminId: string; adminName: string };
    meta?: any;
}

export interface CommunityValuePool {
    id: string;
    total_usd_value: number;
    total_circulating_ccap: number;
    ccap_to_usd_rate: number;
    last_updated: Timestamp;
}

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
    authorId: string;
    authorName: string;
    createdAt: Timestamp;
    voteCountFor: number;
    voteCountAgainst: number;
    votesFor: string[];
    votesAgainst: string[];
    commentCount?: number;
}

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
    ticker: string;
    pitchDeck?: any;
    impactAnalysis: { score: number; reasoning: string };
}

export interface SustenanceCycle {
    id: string;
    slf_balance: number;
    hamper_cost: number;
    last_drop: Timestamp;
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
    lockedUntil?: Timestamp;
    createdAt: Timestamp;
}

export type NavView = MemberView;

export interface TensionPoint {
    id: string;
    type: string;
    value: number;
}

// --- SOCIAL LEDGER ---
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorCircle: string;
  authorRole: string;
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
    receiverPublicKey?: string; // New: Decouple from Firebase for Public Explorer
    parentHash: string;
    priceAtSync?: number; 
    status?: 'pending' | 'verified' | 'failed';
    type?: 'P2P_HANDSHAKE' | 'VOUCH_ANCHOR' | 'REDEMPTION' | 'SYSTEM_MINT' | 'VAULT_SYNC' | 'FIAT_BRIDGE' | 'INTENT_PRIME' | 'SIMULATION_MINT' | 'credit' | 'debit';
    protocol_mode: ProtocolMode; 
    reason?: string;
    sovereign_id?: string; // GitHub/IPFS block ID
    ledger_url?: string; // Link to public block
}

export type Transaction = UbtTransaction;

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
    payment_method: 'FIAT' | 'CRYPTO';
    status: 'PENDING' | 'AWAITING_CONFIRMATION' | 'VERIFIED' | 'REJECTED';
    createdAt: Timestamp;
    cryptoAsset?: string;
    cryptoAddress?: string;
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

export interface ParticipantStatus {
    uid: string;
    name: string;
    isVideoOn: boolean;
    isMicOn: boolean;
    isSpeaking: boolean;
    joinedAt: number;
    isOnStage: boolean;
    isRequestingStage: boolean;
    role: string;
}

export interface Meeting {
    id: string;
    hostId: string;
    title: string;
    expiresAt: Timestamp;
    participants: { [uid: string]: ParticipantStatus };
    kickedParticipantId?: string;
}

export interface RTCSignal {
    type: 'offer' | 'answer';
    sdp: string;
    from: string;
    to: string;
    timestamp?: number;
}

export interface ICESignal {
    candidate: string;
    from: string;
    to: string;
    timestamp?: number;
    sdpMLineIndex?: number;
    sdpMid?: string;
}

export interface SustenanceVoucher {
    id: string;
    value: number;
    status: 'active' | 'redeemed' | 'expired';
    issuedAt: Timestamp;
    expiresAt: Timestamp;
    userName?: string;
    redeemedBy?: string;
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
    createdAt: Timestamp;
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
    signedVotes?: { [uid: string]: string };
}

export interface VentureEquityHolding {
    ventureId: string;
    ventureName: string;
    ventureTicker: string;
    shares: number;
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