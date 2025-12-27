
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  DocumentSnapshot,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import {
    ref,
    onValue,
    set,
    onDisconnect,
    serverTimestamp as rtdbServerTimestamp
} from 'firebase/database';
import { auth, db, rtdb } from './firebase';
import { generateWelcomeMessage } from './geminiService';
import { cryptoService } from './cryptoService';
import { 
    User, Agent, Member, NewMember, MemberUser, Broadcast, Post,
    Comment, Report, Conversation, Message, Notification, Activity,
    Proposal, PublicUserProfile, RedemptionCycle, PayoutRequest, SustenanceCycle, SustenanceVoucher, Venture, CommunityValuePool, VentureEquityHolding, 
    Distribution, Transaction, GlobalEconomy, Admin, UbtTransaction, TreasuryVault, PendingUbtPurchase, SellRequest, P2POffer, AssetType, UserVault,
    CitizenResource, Dispute, Meeting
} from '../types';

const usersCollection = collection(db, 'users');
const membersCollection = collection(db, 'members');
const postsCollection = collection(db, 'posts');
const reportsCollection = collection(db, 'reports');
const conversationsCollection = collection(db, 'conversations');
const activityCollection = collection(db, 'activity');
const proposalsCollection = collection(db, 'proposals');
const payoutsCollection = collection(db, 'payouts');
const vaultsCollection = collection(db, 'treasury_vaults');
const ledgerCollection = collection(db, 'ledger');
const resourcesCollection = collection(db, 'resources');
const disputesCollection = collection(db, 'disputes');
const globalsCollection = collection(db, 'globals');
const pendingPurchasesCollection = collection(db, 'pending_ubt_purchases');
const sellRequestsCollection = collection(db, 'sell_requests');
const p2pCollection = collection(db, 'p2p_offers');
const broadcastsCollection = collection(db, 'broadcasts');
const redemptionCyclesCollection = collection(db, 'redemption_cycles');
const sustenanceCollection = collection(db, 'sustenance_cycles');
const vouchersCollection = collection(db, 'sustenance_vouchers');
const venturesCollection = collection(db, 'ventures');
const meetingsCollection = collection(db, 'meetings');

async function _deletePostAndSubcollections(postId: string) {
    const postRef = doc(postsCollection, postId);
    const commentsSnapshot = await getDocs(collection(db, 'posts', postId, 'comments'));
    const batch = writeBatch(db);
    commentsSnapshot.forEach(doc => { batch.delete(doc.ref); });
    batch.delete(postRef);
    await batch.commit();
}

export const api = {
    login: (email: string, password: string): Promise<FirebaseUser> => {
        return signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => userCredential.user);
    },
    logout: () => signOut(auth),
    sendPasswordReset: (email: string) => sendPasswordResetEmail(auth, email),
    sendEmailVerification: async () => {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
        else throw new Error("No user is currently signed in.");
    },
    setupPresence: (