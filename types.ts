import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'agent' | 'member' | 'vendor';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'ousted';

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  circle: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
  isProfileComplete: boolean;
  phone?: string;
  address?: string;
  bio?: string;
  id_card_number?: string; // For agents/admins
  national_id?: string; // For members
  // Member specific profile fields
  profession?: string;
  skills?: string;
  awards?: string;
  interests?: string;
  passions?: string;
  gender?: string;
  age?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
  // Capital
  scap?: number;
  ccap?: number;
  // Knowledge
  knowledgePoints?: number;
  hasReadKnowledgeBase?: boolean;
  // Referral
  referralCode?: string;
  referralEarnings?: number;
  referredBy?: string;
  // Sustenance
  sustenanceVouchers?: SustenanceVoucher[];
  lastDailyCheckin?: Timestamp;
  // Ventures
  ventureEquity?: VentureEquityHolding[];
  // Proposals
  lastCycleChoice?: 'redeemed' | 'staked' | 'invested';
  currentCycleCcap?: number;
  stakedCcap?: number;
  // Pitch Deck
  pitchDeckTitle?: string;
  pitchDeckSlides?: { title: string; content: string }[];
}

export interface Admin extends BaseUser {
  role: 'admin';
}

export interface Agent extends BaseUser {
  role: 'agent';
  agent_code: string;
  commissionBalance?: number;
}

export interface MemberUser extends BaseUser {
  role: 'member';
  member_id: string; // Link to the 'members' collection document
  credibility_score: number;
  distress_calls_available: number;
  last_distress_call?: Timestamp;
}

export interface VendorUser extends BaseUser {
  role: 'vendor';
  businessName: string;
  balance: number;
}


export type User = Admin | Agent | MemberUser | VendorUser;

export interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number; // in CCAP
  requiredSkills: string[];
  status: 'open' | 'assigned' | 'in_review' | 'completed';
  creatorId: string;
  creatorName: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  role: UserRole;
  circle: string;
  status: UserStatus;
  bio?: string;
  profession?: string;
  skills?: string;
  interests?: string;
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


export interface Member {
  id: string;
  uid?: string; // UID of the user account, if created
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
  is_duplicate_email?: boolean;
  // Enriched fields from User profile for admin views
  status?: User['status'];
  distress_calls_available?: number;
  address?: string;
  national_id?: string;
  bio?: string;
  profession?: string;
  skills?: string;
  awards?: string;
  interests?: string;
  passions?: string;
  gender?: string;
  age?: string;
  isLookingForPartners?: boolean;
  lookingFor?: string[];
  businessIdea?: string;
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
  phone: string;
  email: string;
  circle: string;
  address: string;
  national_id: string;
  referralCode?: string;
}

export interface Broadcast {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  date: string; // ISO string
}

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorCircle: string;
    authorRole: UserRole;
    content: string;
    date: string; // ISO string
    upvotes: string[];
    commentCount?: number;
    repostCount?: number;
    types: 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress';
    isPinned?: boolean;
    isKnowledgePost?: boolean;
    repostedFrom?: {
        authorId: string;
        authorName: string;
        authorCircle: string;
        content: string;
        date: string;
    };
}

export interface Comment {
    id: string;
    parentId: string; // ID of the post or proposal
    authorId: string;
    authorName: string;
    content: string;
    timestamp: Timestamp;
    upvotes: string[];
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
    details: string;
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
    name?: string; // Group name
    adminIds?: string[]; // Group admins
}

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'NEW_MESSAGE' | 'NEW_CHAT' | 'POST_LIKE' | 'POST_COMMENT' | 'NEW_FOLLOWER' | 'NEW_MEMBER' | 'NEW_POST_PROPOSAL' | 'NEW_POST_OPPORTUNITY' | 'NEW_POST_GENERAL' | 'NEW_POST_OFFER' | 'KNOWLEDGE_APPROVED';
  link: string; // e.g., conversationId, postId, userId
  causerId: string;
  causerName: string;
  read: boolean;
  timestamp: Timestamp;
}

export interface Activity {
    id: string;
    type: 'NEW_MEMBER' | 'NEW_POST_PROPOSAL' | 'NEW_POST_OPPORTUNITY' | 'NEW_POST_GENERAL' | 'NEW_POST_OFFER';
    message: string;
    causerId: string;
    causerName: string;
    causerCircle: string;
    link: string;
    timestamp: Timestamp;
}

export type NotificationItem = (Notification & { itemType: 'notification' }) | (Activity & { itemType: 'activity' });


export interface Proposal {
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    description: string;
    createdAt: Timestamp;
    status: 'active' | 'passed' | 'failed' | 'closed';
    votesFor: string[];
    votesAgainst: string[];
    voteCountFor: number;
    voteCountAgainst: number;
}

export interface RedemptionCycle {
    id: string;
    startDate: Timestamp;
    endDate: Timestamp;
    windowStartDate: Timestamp;
    windowEndDate: Timestamp;
    status: 'active' | 'window_open' | 'closed';
    total_ccap_earned: number;
    cvp_usd_total: number;
    ccap_to_usd_rate: number;
}

export interface PayoutRequest {
    id: string;
    userId: string;
    userName: string;
    type: 'referral' | 'ccap_redemption' | 'veq_redemption' | 'commission';
    amount: number; // For referral/ccap in USD, for VEQ in shares
    ecocashName: string;
    ecocashNumber: string;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: Timestamp;
    meta?: {
        ventureId?: string;
        ventureName?: string;
        ccapToRedeem?: number;
        ccapUsdValue?: number;
    };
}

export interface SustenanceCycle {
    id: 'current';
    last_run: Timestamp;
    next_run: Timestamp;
    slf_balance: number; // Sustenance & Logistics Fund
    hamper_cost: number;
}

export interface SustenanceVoucher {
    id: string; // e.g., UGCV-XXXXXX
    userId: string;
    userName: string;
    value: number;
    status: 'active' | 'redeemed' | 'expired';
    issuedAt: Timestamp;
    expiresAt: Timestamp;
    redeemedAt?: Timestamp;
    redeemedBy?: string; // Vendor ID
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
    status: 'fundraising' | 'fully_funded' | 'operational' | 'on_hold' | 'completed';
    createdAt: Timestamp;
    backers: string[];
    pitchDeck: {
        title: string;
        slides: { title: string; content: string }[];
    };
    impactAnalysis: {
        score: number;
        reasoning: string;
    };
    ticker: string;
    totalSharesIssued: number;
    totalProfitsDistributed: number;
}

export interface VentureEquityHolding {
    ventureId: string;
    ventureName: string;
    ventureTicker: string;
    shares: number;
}

export interface Distribution {
  id: string;
  totalAmount: number;
  notes: string;
  date: Timestamp;
}

export interface CommunityValuePool {
    id: 'singleton';
    total_usd_value: number;
    total_circulating_ccap: number;
    ccap_to_usd_rate: number;
}

export type FilterType = 'general' | 'proposal' | 'offer' | 'opportunity' | 'distress' | 'all';