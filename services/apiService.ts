import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInAnonymously,
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
import { sovereignService } from './sovereignService';
import { 
    User, Agent, Member, NewMember, MemberUser, Post,
    Conversation, Message, Notification, Activity,
    PublicUserProfile, PayoutRequest, Transaction, Admin, UbtTransaction, TreasuryVault, PendingUbtPurchase,
    CitizenResource, Dispute, Meeting, GlobalEconomy, CommunityValuePool, Proposal, Venture, SustenanceCycle, SustenanceVoucher, Comment, Distribution, VentureEquityHolding,
    RedemptionCycle, ParticipantStatus, RTCSignal, ICESignal, Candidate, MultiSigProposal
} from '../types';

const usersCollection = collection(db, 'users');
const membersCollection = collection(db, 'members');
const postsCollection = collection(db, 'posts');
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
const meetingsCollection = collection(db, 'meetings');
const candidatesCollection = collection(db, 'candidates');
const broadcastsCollection = collection(db, 'broadcasts');
const multisigCollection = collection(db, 'multisig_proposals');

export const api = {
    login: (email: string, password: string): Promise<FirebaseUser> => {
        return signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => userCredential.user);
    },
    loginAnonymously: (displayName: string): Promise<FirebaseUser> => {
        return signInAnonymously(auth)
            .then(userCredential => userCredential.user);
    },
    logout: () => signOut(auth),
    sendPasswordReset: (email: string) => sendPasswordResetEmail(auth, email),
    sendEmailVerification: async () => {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
        else throw new Error("No user is currently signed in.");
    },
    setupPresence: (userId: string) => {
        const userStatusDatabaseRef = ref(rtdb, '/status/' + userId);
        const isOfflineForDatabase = { state: 'offline', last_changed: rtdbServerTimestamp() };
        const isOnlineForDatabase = { state: 'online', last_changed: rtdbServerTimestamp() };
        onValue(ref(rtdb, '.info/connected'), (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                set(userStatusDatabaseRef, isOnlineForDatabase);
            });
        });
    },
    goOffline: (userId: string) => set(ref(rtdb, '/status/' + userId), { state: 'offline', last_changed: rtdbServerTimestamp() }),

    getUser: async (uid: string): Promise<User> => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) throw new Error("User data not found.");
        return { id: userDoc.id, ...userDoc.data() } as User;
    },
    getUserByPublicKey: async (publicKey: string): Promise<User | null> => {
        const q = query(usersCollection, where('publicKey', '==', publicKey), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    },
    updateUser: async (uid: string, data: Partial<User>) => {
        if (data.publicKey || data.isProfileComplete) {
            try {
                await sovereignService.dispatchIdentity(uid, { ...data, updatedAt: Date.now() });
            } catch (e) {
                console.warn("SOVEREIGN_SYNC_DELAYED: Identity anchored to cloud only for now.");
            }
        }
        return setDoc(doc(db, 'users', uid), data, { merge: true });
    },
    
    getUsersByUids: async (uids: string[]): Promise<User[]> => {
        if (uids.length === 0) return [];
        const results: User[] = [];
        for (let i = 0; i < uids.length; i += 10) {
            const chunk = uids.slice(i, i + 10);
            const q = query(usersCollection, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        }
        return results;
    },

    requestPayout: (u: User, n: string, p: string, a: number) => {
        return addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'referral', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() });
    },
    
    requestCommissionPayout: (a: Agent, name: string, phone: string, amount: number) => addDoc(payoutsCollection, { userId: a.id, userName: a.name, type: 'referral', amount, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp() }),

    processUbtTransaction: async (transaction: UbtTransaction) => {
        let ledgerUrl = "";
        try {
            const githubUrl = await sovereignService.dispatchTransaction(transaction);
            if (githubUrl) ledgerUrl = githubUrl;
        } catch (e) {
            throw new Error("SOVEREIGN_HANDSHAKE_FAILED: Could not commit to global ledger. Transaction aborted for safety.");
        }

        return runTransaction(db, async (t) => {
            const econRef = doc(globalsCollection, 'economy');
            const isFloatSender = ['GENESIS', 'FLOAT', 'SYSTEM', 'DISTRESS', 'SUSTENANCE', 'VENTURE'].includes(transaction.senderId);
            const senderRef = isFloatSender ? doc(vaultsCollection, transaction.senderId) : doc(usersCollection, transaction.senderId);
            const receiverRef = doc(usersCollection, transaction.receiverId);
            
            const [econSnap, senderSnap] = await Promise.all([t.get(econRef), t.get(senderRef)]);
            const currentPrice = econSnap.exists() ? econSnap.data()?.ubt_to_usd_rate : 0.001;
            const balKey = isFloatSender ? 'balance' : 'ubtBalance';
            const senderBal = senderSnap.data()?.[balKey] || 0;
            
            if (senderBal < transaction.amount) throw new Error("INSUFFICIENT_LIQUIDITY");
            
            t.update(senderRef, { [balKey]: increment(-transaction.amount) });
            t.update(receiverRef, { ubtBalance: increment(transaction.amount) });
            t.set(doc(ledgerCollection, transaction.id), { 
                ...transaction, 
                priceAtSync: currentPrice, 
                serverTimestamp: serverTimestamp(),
                ledger_url: ledgerUrl 
            });
        }); 
    },

    getUserLedger: async (uid: string) => {
        const q1 = query(ledgerCollection, where('senderId', '==', uid));
        const q2 = query(ledgerCollection, where('receiverId', '==', uid));
        const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const res = [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
        return Array.from(new Map(res.map(i => [i.id, i])).values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },

    applyForExecutive: async (candidateData: Omit<Candidate, 'id' | 'voteCount' | 'votes' | 'createdAt' | 'status'>) => {
        return addDoc(candidatesCollection, {
            ...candidateData,
            voteCount: 0,
            votes: [],
            status: 'applying',
            createdAt: serverTimestamp()
        });
    },

    deleteCandidate: (candidateId: string) => deleteDoc(doc(candidatesCollection, candidateId)),

    voteForCandidate: (candidateId: string, voterId: string) => runTransaction(db, async t => {
        const ref = doc(candidatesCollection, candidateId);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error("Candidate node lost.");
        const data = snap.data() as Candidate;
        if (data.votes.includes(voterId)) throw new Error("DUPLICATE_SIGNATURE");
        
        const newVoteCount = (data.voteCount || 0) + 1;
        const newStatus = newVoteCount >= 20 ? 'mandated' : 'applying';
        
        t.update(ref, { 
            votes: arrayUnion(voterId), 
            voteCount: increment(1),
            status: newStatus
        });
    }),

    listenForCandidates: (cb: (c: Candidate[]) => void): Unsubscribe => {
        return onSnapshot(query(candidatesCollection, orderBy('voteCount', 'desc')), s => {
            cb(