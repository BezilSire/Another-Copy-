import { Timestamp } from 'firebase/firestore';

export type UserRole = 'member' | 'agent' | 'admin' | 'creator' | 'vendor';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'ousted';
export type FilterType = 'all' | 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress';

// Base User
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
  skills?: string[] | string;
  interests?: string[] | string;
  passions?: string[] | string;
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
  scap?: number; // Social Capital
  ccap?: number; // Civic Capital
  referralEarnings?: number;
  ventureEquity?: VentureEquityHolding[];
  lastDailyCheckin?: Timestamp;
  sustenanceVouchers?: SustenanceVoucher[];
  stakedCcap?: number;
  currentCycleCcap?: number;
  lastCycleChoice?: 'redeemed' | 'staked' | 'invested';
  fcmTokens?: string[];
}

// Specific User Roles
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

export interface Creator extends User {
    role: 'creator';
    commissionBalance?: number;
}

export interface VendorUser extends User {
    role: 'vendor';
    businessName?: string;
    balance?: number;
}

// From 'members' collection
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
  date_registered: string;
  welcome_message: string;
  membership_card_id: string;
  uid?: string; // Link to user ID in 'users' collection
  is_duplicate_email?: boolean;
  status?: UserStatus; // Denormalized from User profile
  distress_calls_available?: number; // Denormalized
  address?: string;
  national_id?: string;
  bio?: string;
  profession?: string;
  skills?: string[] | string;
  awards?: string;
  interests?: string[] | string;
  passions?: string[] | string;
  gender?: string;
  age?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
}

// For registering a new member
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
    phone: string;
    email: string;
    circle: string;
    address: string;
    national_id: string;
    referralCode?: string;
}

// Broadcasts
export interface Broadcast {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  date: string; // ISO string
}

// Posts
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorCircle: string;
  authorRole: UserRole;
  content: string;
  date: string; // ISO string
  upvotes: string[];
  types: 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress';
  commentCount?: number;
  repostCount?: number;
  isPinned?: boolean;
  repostedFrom?: {
    authorId: string;
    authorName: string;
    authorCircle: string;
    content: string;
    date: string;
  }
}

// Comments
export interface Comment {
    id: string;
    parentId: string;
    authorId: string;
    authorName: string;
    content: string;
    upvotes: string[];
    timestamp: Timestamp;
}

// Reports
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
    date: string; // ISO string
    status: 'new' | 'resolved';
}

// Conversations
export interface Conversation {
    id: string;
    members: string[];
    memberNames: { [key: string]: string };
    lastMessage: string;
    lastMessageTimestamp: Timestamp;
    lastMessageSenderId: string;
    readBy: string[];
    isGroup: boolean;
    name?: string; // For group chats
}

// Messages
export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Timestamp;
}

// Notifications & Activity
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

// Public User Profile (for security, only expose some fields)
export interface PublicUserProfile extends Partial<User> {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    circle: string;
    status: UserStatus;
    bio?: string;
    profession?: string;
    skills?: string[] | string;
    interests?: string[] | string;
    businessIdea?: string;
    isLookingForPartners?: boolean;
    lookingFor?: string[];
    credibility_score?: number;
    scap?: number;
    ccap?: number;
    createdAt?: Timestamp;
    pitchDeckTitle?: string;
    pitchDeckSlides?: { title: string; content: string }[];
}

// Proposals
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
}

// Economy
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
    type: 'referral' | 'commission' | 'ccap_redemption' | 'veq_redemption' | 'admin_referral_bonus';
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: Timestamp;
    ecocashName: string;
    ecocashNumber: string;
    meta?: any;
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

export interface CreatorContent {
    id: string;
    creatorId: string;
    title: string;
    content: string;
    createdAt: Timestamp;
}