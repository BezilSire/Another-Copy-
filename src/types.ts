
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'member' | 'agent' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'ousted';
export type FilterType = 'all' | 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress' | 'foryou' | 'following';
export type ProtocolMode = 'MAINNET' | 'TESTNET';
export type AssetType = 'SOL' | 'USDT' | 'USDC';

export type NavView = 'profile' | 'notifications' | 'sustenance' | 'knowledge' | 'security' | 'state' | 'audit' | 'ledger' | 'meetings' | 'wallet';
export type MemberView = NavView | 'home' | 'hub' | 'chats' | 'community' | 'ventures' | 'more';

export interface ParticipantStatus {
    isVideoOn: boolean;
    isMicOn: boolean;
    isSpeaking: boolean;
}

export interface Meeting {
    id: string;
    hostId: string;
    hostName: string;
    title: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    offer?: any;
    answer?: any;
    callerStatus?: ParticipantStatus;
    calleeStatus?: ParticipantStatus;
    kickedParticipantId?: string;
}

export interface User {
  id: string;
  name: string;
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
  interests?: string[];
  passions?: string[];
  awards?: string;
  gender?: string;
  age?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  pitchDeckTitle?: string;
  pitchDeckSlides?: { title: string; content: string }[];
  id_card_number?: string;
  knowledgePoints?: number;
  hasReadKnowledgeBase?: boolean;
  scap?: number; 
  ccap?: number; 
  referralEarnings?: number;
  ventureEquity?: VentureEquityHolding[];
  lastDailyCheckin?: Timestamp;
  sustenanceVouchers?: SustenanceVoucher[];
  stakedCcap?: number;
  currentCycleCcap?: number;
  lastCycleChoice?: 'redeemed' | 'staked' | 'invested';
  name_lowercase?: string;
  skills_lowercase?: string[];
  ubtBalance?: number; 
  initialUbtStake?: number;
  fcmToken?: string;
  publicKey?: string;
  vouchCount?: number;
  credibility_score?: number;
  socialLinks?: { title: string; url: string }[];
  following?: string[];
  followers?: string[];
}

export interface UserVault {
    id: string;
    userId: string;
    name: string;
    balance: number;
    type: 'HOT' | 'LOCKED' | 'BUSINESS' | 'LIQUID';
    lockedUntil?: Timestamp;
    createdAt: Timestamp;
}

export interface TreasuryVault {
    id: string;
    name: string;
    description: string;
    balance: number;
    publicKey: string;
    type: 'GENESIS' | 'SUSTENANCE' | 'DISTRESS' | 'VENTURE' | 'FLOAT';
    isLocked: boolean;
}

export interface CitizenResource {
    id: string;
    name: string;
    type: 'ENERGY' | 'WATER' | 'FOOD' | 'LAND' | 'EQUIPMENT';
    circle: string;
    location: string;
    status: 'OPTIMAL' | 'WARNING' | 'MAINTENANCE' | 'DEPLETED';
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
    status: 'TRIBUNAL' | 'RESOLVED' | 'DISMISSED';
    juryIds: string[];
    votesForClaimant: number;
    votesForRespondent: number;
    timestamp: Timestamp;
    resolvedAt?: Timestamp;
    signedVotes: { [userId: string]: string };
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
    balanceBefore?: number;
    balanceAfter?: number;
    txHash?: string;
    protocol_mode?: ProtocolMode;
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
  distress_calls_available?: number;
  address?: string;
  national_id?: string;
  bio?: string;
  profession?: string;
  skills?: string[];
  awards?: string;
  interests?: string[];
  passions?: string[];
  gender?: string;
  age?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  skills_lowercase?: string[];
  is_duplicate_email?: boolean;
}

export interface NewMember {
  full_name: string;
  phone: string;
  email: string;
  circle: string;
  registration_amount: number;
  payment_status: 'pending' | 'complete' | 'installment';
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

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorCircle: string;
  authorRole: UserRole;
  authorInterests?: string[];
  content: string;
  date: string;
  upvotes: string[];
  types: 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress';
  commentCount?: number;
  repostCount?: number;
  isPinned?: boolean;
  requiredSkills?: string[];
  repostedFrom?: {
    authorId: string;
    authorName: string;
    authorCircle: string;
    content: string;
    date: string;
  }
}

export interface Comment {
    id: string;
    parentId: string;
    authorId: string;
    authorName: string;
    content: string;
    upvotes: string[];
    timestamp: Timestamp;
}

export interface Report {
    id: string;
    reporterId: string;
    reporterName: string;
    reportedUserId: string;
    reportedUserName: string;
    postId?: string;
    postContent?: string;
    postAuthorId?: string;
    reason: string;
    details?: string;
    date: string;
    status: 'new' | 'resolved';
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
    bio?: string;
    profession?: string;
    skills?: string[];
    interests?: string[];
    businessIdea?: string;
    isLookingForPartners?: boolean;
    lookingFor?: string[];
    credibility_score?: number;
    scap?: number;
    ccap?: number;
    createdAt?: Timestamp;
    publicKey?: string;
    ubtBalance?: number;
    vouchCount?: number;
}

export interface Proposal {
    id: string;
    title: string;
    description: string;
    authorId: string;
    authorName: string;
    createdAt: Timestamp;
    status: 'active' | 'passed' | 'failed' | 'closed';
    votesFor: string[];
    votesAgainst: string[];
    voteCountFor: number;
    voteCountAgainst: number;
    commentCount?: number;
}

export interface RedemptionCycle {
    id: string;
    startDate: Timestamp;
    endDate: Timestamp;
    windowEndDate: Timestamp;
    status: 'active' | 'window_open' | 'closed';
    ccap_to_usd_rate: number;
    total_ccap_earned: number;
    cvp_usd_total: number;
}

export interface PayoutRequest {
    id: string;
    userId: string;
    userName: string;
    type: 'referral' | 'commission' | 'ccap_redemption' | 'veq_redemption' | 'ubt_redemption' | 'onchain_withdrawal';
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: Timestamp;
    ecocashName: string;
    ecocashNumber: string;
    meta?: {
        solanaAddress?: string;
        ventureId?: string;
        ventureName?: string;
        ubtAmount?: number;
        ubtToUsdRate?: number;
        ccapAmount?: number;
        ccapToUsdRate?: number;
    };
    processedBy?: {
        adminId: string;
        adminName: string;
    };
    completedAt?: Timestamp;
}

export interface SustenanceCycle {
    slf_balance: number;
    hamper_cost: number;
    last_run: Timestamp;
    next_run: Timestamp;
}

export interface SustenanceVoucher {
    id: string;
    userId: string;
    userName: string;
    value: number;
    status: 'active' | 'redeemed' | 'expired';
    issuedAt: Timestamp;
    expiresAt: Timestamp;
    redeemedAt?: Timestamp;
    redeemedBy?: string;
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
    status: 'fundraising' | 'operational' | 'fully_funded' | 'completed' | 'on_hold' | 'pending_approval';
    createdAt: Timestamp;
    pitchDeck: { title: string; slides: { title: string; content: string }[] };
    impactAnalysis: { score: number; reasoning: string };
    ticker: string;
    totalSharesIssued: number;
    totalProfitsDistributed: number;
}

export interface CommunityValuePool {
    id: string;
    total_usd_value: number;
    total_circulating_ccap: number;
    ccap_to_usd_rate: number;
}

export interface VentureEquityHolding {
    ventureId: string;
    ventureName: string;
    ventureTicker: string;
    shares: number;
}

export interface Distribution {
    id: string;
    date: Timestamp;
    totalAmount: number;
    notes: string;
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
    ubt_in_cvp?: number;
    system_sol_address?: string;
    system_usdt_address?: string;
    system_usdc_address?: string;
}

export interface P2POffer {
    id: string;
    sellerId: string;
    sellerName: string;
    type: 'BUY' | 'SELL';
    amount: number;
    pricePerUnit: number;
    totalPrice: number;
    paymentMethod: string;
    status: 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
    buyerId?: string;
    buyerName?: string;
    createdAt: Timestamp;
    lockedAt?: Timestamp;
    escrowTxId?: string;
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
    verifiedAt?: Timestamp;
}

export interface SellRequest {
    id: string;
    userId: string;
    userName: string;
    userPhone: string;
    amountUbt: number;
    amountUsd: number;
    status: 'PENDING' | 'CLAIMED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
    createdAt: Timestamp;
    claimerId?: string;
    claimerName?: string;
    claimerRole?: UserRole;
    ecocashRef?: string;
    claimedAt?: Timestamp;
    dispatchedAt?: Timestamp;
    completedAt?: Timestamp;
}
