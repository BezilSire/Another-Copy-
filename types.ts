import { Timestamp } from 'firebase/firestore';

// A new, separate interface for data that is safe to be public.
// This will be stored in a 'publicProfiles' collection.
export interface PublicUserProfile {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  role: 'admin' | 'agent' | 'member' | 'vendor';
  circle?: string;
  bio?: string;
  profession?: string;
  skills?: string;
  interests?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  credibility_score?: number;
  status?: 'active' | 'pending' | 'suspended' | 'ousted';
  online?: boolean;
  lastSeen?: Timestamp;
  scap?: number;
  ccap?: number;
  createdAt?: Timestamp;
}


// The base user structure, stored in the 'users' collection in Firestore.
// This now contains more sensitive information.
export interface User extends PublicUserProfile {
  email: string;
  password?: string; // Only used during signup, not stored
  phone?: string;
  address?: string;
  id_card_number?: string;
  knowledgePoints?: number;
  hasReadKnowledgeBase?: boolean;
  isProfileComplete: boolean;
  pitchDeckTitle?: string;
  pitchDeckSlides?: { title: string; content: string }[];
  lastDailyCheckin?: Timestamp;
  // Referral System
  referralCode?: string;
  referredBy?: string; // UID of the user who referred this one
  referralEarnings?: number; // In USD
  // Venture Equity
  ventureEquity?: VentureEquityHolding[];
  // Redemption Protocol
  currentCycleCcap?: number; // CCAP earned in the current cycle, separate from total
  stakedCcap?: number; // CCAP staked for HODL bonus
  lastCycleChoice?: 'redeemed' | 'staked' | 'invested' | null;
  // Proof of Sustenance
  sustenanceTickets?: number;
  sustenanceVouchers?: SustenanceVoucher[];
  // Optional fields from Member that are synced for profile editing
  profession?: string;
  skills?: string;
  interests?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  createdAt?: Timestamp;
}

// Agent-specific properties, extending the base User.
export interface Agent extends User {
  role: 'agent';
  agent_code: string;
  circle: string;
  referralCode: string;
  referralEarnings: number;
  scap: number;
  ccap: number;
  ventureEquity: VentureEquityHolding[];
  currentCycleCcap: number;
  stakedCcap: number;
}

// Data structure for a registered member, stored in the 'members' collection.
export interface Member {
  id: string; // Firestore document ID
  full_name: string;
  phone: string;
  email: string;
  circle: string;
  registration_amount: number;
  payment_status: 'complete' | 'installment' | 'pending' | 'pending_verification' | 'rejected';
  agent_id: string;
  agent_name?: string;
  date_registered: string; // ISO string
  membership_card_id: string;
  welcome_message: string;
  uid?: string | null; // Firebase Auth UID, linked after account activation
  is_duplicate_email?: boolean;
  needs_welcome_update?: boolean; // Flag for deferred AI message generation
  // Fields for member profile
  bio?: string;
  profession?: string;
  skills?: string;
  awards?: string;
  interests?: string;
  passions?: string;
  gender?: string;
  age?: string;
  address?: string;
  national_id?: string;
  // Enriched data from 'users' collection for admin views
  status?: User['status'];
  distress_calls_available?: number;
  // Venture fields
  isLookingForPartners?: boolean;
  lookingFor?: string[]; // e.g., ['Co-founder', 'Investor']
  businessIdea?: string;
  pitchDeckTitle?: string;
  pitchDeckSlides?: { title: string; content: string }[];
  // Referral
  referredBy?: string; // UID of the referring user
}

// The user object for a logged-in member, combining User and some Member details.
export interface MemberUser extends User {
    role: 'member';
    member_id: string; // Document ID from the 'members' collection
    distress_calls_available: number;
    last_distress_post_id?: string | null;
    status: 'active' | 'pending' | 'suspended' | 'ousted';
    credibility_score: number;
    // Venture fields
    isLookingForPartners?: boolean;
    lookingFor?: string[];
    businessIdea?: string;
    skills?: string;
    interests?: string;
    profession?: string;
    pitchDeckTitle?: string;
    pitchDeckSlides?: { title: string; content: string }[];
    // Proof of Contribution
    scap: number;
    ccap: number; // Total lifetime CCAP
    currentCycleCcap: number; // CCAP for the current redemption cycle
    stakedCcap: number; // Staked CCAP from previous cycles
    lastDailyCheckin?: Timestamp;
    // Referral System
    referralCode: string;
    referralEarnings: number;
    // Venture Equity
    ventureEquity: VentureEquityHolding[];
    // Proof of Sustenance
    sustenanceTickets: number;
    sustenanceVouchers: SustenanceVoucher[];
}

// Simplified Admin type, extending User.
export interface Admin extends User {
    role: 'admin';
    referralCode: string;
    referralEarnings: number;
    scap: number;
    ccap: number;
    ventureEquity: VentureEquityHolding[];
    currentCycleCcap: number;
    stakedCcap: number;
}

// Vendor-specific user type
export interface VendorUser extends User {
    role: 'vendor';
    businessName?: string;
    balance?: number; // in USD, from redeemed vouchers
}


// Type for data when an agent registers a new member.
export interface NewMember {
  full_name: string;
  phone: string;
  email: string;
  circle: string;
  registration_amount: number;
  payment_status: 'complete' | 'installment';
}

// Type for data when a member signs up publicly.
export interface NewPublicMemberData {
  full_name: string;
  phone: string;
  email: string;
  circle: string;
  address: string;
  national_id: string;
  referralCode?: string;
}

// Structure for admin broadcasts.
export interface Broadcast {
  id: string;
  message: string;
  date: string; // ISO string
}

// Structure for posts in the community feed.
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorCircle: string;
  authorRole: 'admin' | 'agent' | 'member' | 'vendor';
  content: string;
  date: string; // ISO string
  upvotes: string[]; // Array of user IDs
  replies?: string[]; // Array of post IDs (for future implementation)
  types: 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress';
  repostCount?: number;
  repostedFrom?: {
    postId: string;
    authorId: string;
    authorName: string;
    authorCircle: string;
    content: string;
    date: string;
  };
  commentCount?: number;
  isPinned?: boolean;
}

// Structure for a community proposal for voting
export interface Proposal {
  id: string;
  title: string;
  description: string;
  createdBy: string; // admin ID
  createdAt: Timestamp;
  status: 'active' | 'closed' | 'passed' | 'failed';
  votesFor: string[]; // array of member user IDs
  votesAgainst: string[]; // array of member user IDs
  voteCountFor: number;
  voteCountAgainst: number;
  endsAt?: Timestamp; // optional deadline for voting
  commentCount?: number;
}


// Structure for a chat conversation.
export interface Conversation {
    id: string;
    isGroup: boolean;
    name?: string; // Group name
    members: string[]; // Array of user IDs
    memberNames: { [key: string]: string };
    lastMessage: string;
    lastMessageSenderId: string;
    lastMessageTimestamp: Timestamp; // Firestore Timestamp
    readBy: string[];
}

// Structure for a single chat message.
export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Timestamp; // Firestore Timestamp
}

// Structure for a report (for posts).
export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  postId: string;
  postAuthorId: string;
  postContent: string;
  reason: string;
  details: string;
  date: string; // ISO
  status: 'new' | 'resolved';
}

// Structure for a user report.
export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
  date: string; // ISO
  status: 'new' | 'resolved';
}

// Structure for a comment on a post.
export interface Comment {
  id: string;
  parentId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Timestamp; // Firestore Timestamp
  upvotes: string[]; // Array of user IDs
}


// Personal, user-specific notifications
export interface Notification {
  id: string;
  userId: string; // Recipient
  type: 'NEW_MESSAGE' | 'POST_LIKE' | 'NEW_CHAT' | 'NEW_FOLLOWER' | 'POST_COMMENT';
  message: string;
  link: string; // convoId or postId or userId
  causerId: string;
  causerName: string;
  timestamp: Timestamp;
  read: boolean;
}

// Global activity feed items
export interface Activity {
  id: string;
  type: 'NEW_MEMBER' | 'NEW_POST_PROPOSAL' | 'NEW_POST_OPPORTUNITY' | 'NEW_POST_GENERAL' | 'NEW_POST_OFFER';
  message: string;
  link: string; // userId or postId
  causerId: string;
  causerName: string;
  causerCircle: string;
  timestamp: Timestamp;
}

// Merged type for the UI
export type NotificationItem = (Notification & { itemType: 'notification' }) | (Activity & { itemType: 'activity' });

// Structure for a payout request.
export interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  ecocashName: string;
  ecocashNumber: string;
  amount: number; // For 'referral' & 'ccap', this is USD. For 'veq', this is number of shares.
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: Timestamp;
  completedAt?: Timestamp;
  type?: 'referral' | 'ccap_redemption' | 'veq_redemption'; // Differentiate payout types
  meta?: { // Extra info for complex payouts like VEQ
    ventureId?: string;
    ventureName?: string;
  };
}

// ** Venture Equity System **

// Represents a user's stake in a specific venture. Stored on the User object.
export interface VentureEquityHolding {
  ventureId: string;
  ventureName: string;
  ventureTicker: string;
  shares: number;
}

// Represents a venture in the 'ventures' collection.
export interface Venture {
  id: string;
  name: string;
  ticker: string;
  description: string;
  totalSharesIssued: number;
  status: 'pending_approval' | 'fundraising' | 'fully_funded' | 'operational' | 'completed' | 'on_hold' | 'rejected';
  totalProfitsDistributed: number; // Total profits distributed across all shareholders
  // New fields for the marketplace
  ownerId: string;
  ownerName: string;
  fundingGoalUsd: number; // e.g., 500
  fundingGoalCcap: number; // e.g., 250000
  fundingRaisedCcap: number;
  backers: { userId: string, userName: string, ccapPledged: number }[];
  pitchDeck: { title: string; slides: { title: string; content: string }[] };
  impactAnalysis: {
    score: number;
    reasoning: string;
  };
  createdAt: Timestamp;
}


// Represents a single profit distribution event for a venture. Stored in a sub-collection.
export interface Distribution {
  id: string;
  ventureId: string;
  date: Timestamp;
  totalAmount: number; // Total amount distributed in this event
  notes: string;
}

// ** Redemption Protocol System **
export interface RedemptionCycle {
  id: string; // e.g., '2024-08'
  status: 'active' | 'window_open' | 'closed';
  startDate: Timestamp;
  endDate: Timestamp;
  windowEndDate: Timestamp;
  cvp_usd_total: number; // Community Value Pool in USD
  total_ccap_earned: number; // Total CCAP earned by all members this cycle
  ccap_usd_value: number; // Calculated value of 1 CCAP in USD
}

export interface CommunityValuePool {
    id: string; // 'main'
    total_usd_value: number;
    total_circulating_ccap: number;
    ccap_to_usd_rate: number;
}


// ** Proof of Sustenance System **
export interface SustenanceVoucher {
  id: string;
  userId: string;
  userName: string;
  cycleId: string; // e.g., '2024-09-10'
  value: number; // e.g., 50 USD
  status: 'active' | 'redeemed' | 'expired';
  issuedAt: Timestamp;
  expiresAt: Timestamp;
  redeemedAt?: Timestamp;
  redeemedBy?: string; // Vendor User ID
}

export interface SustenanceCycle {
  id: string; // e.g., '2024-09-10'
  date: Timestamp;
  slf_balance: number; // Sustenance & Logistics Fund
  hamper_cost: number;
  winners_count: number;
  winner_ids: string[];
}