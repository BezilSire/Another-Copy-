
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
        // Sovereignty Law: Dispatch identity state to ledger mirror if anchoring
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
        // Law 1: Anchoring to Sovereign Ledger (GitHub Mirror)
        let ledgerUrl = "";
        try {
            const githubUrl = await sovereignService.dispatchTransaction(transaction);
            if (githubUrl) ledgerUrl = githubUrl;
        } catch (e) {
            throw new Error("SOVEREIGN_HANDSHAKE_FAILED: Could not commit to global ledger. Transaction aborted for safety.");
        }

        // Law 2: Cloud State Reconciliation
        return runTransaction(db, async (t) => {
            const econRef = doc(globalsCollection, 'economy');
            const floatRef = doc(vaultsCollection, 'FLOAT');
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
            cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
        });
    },

    syncInternalVaults: (admin: Admin, from: TreasuryVault, to: TreasuryVault, amt: number, reason: string) => runTransaction(db, async t => {
        const fromRef = doc(vaultsCollection, from.id);
        const toRef = doc(vaultsCollection, to.id);
        const econSnap = await t.get(doc(globalsCollection, 'economy'));
        t.update(fromRef, { balance: increment(-amt) });
        t.update(toRef, { balance: increment(amt) });
        const txId = `internal-${Date.now().toString(36)}`;
        t.set(doc(ledgerCollection, txId), { id: txId, senderId: from.id, receiverId: to.id, amount: amt, timestamp: Date.now(), reason, type: 'VAULT_SYNC', protocol_mode: 'MAINNET', senderPublicKey: admin.publicKey || "ROOT_AUTH", priceAtSync: econSnap.exists() ? econSnap.data()?.ubt_to_usd_rate : 0.001, serverTimestamp: serverTimestamp() });
    }),
    
    approveUbtPurchase: (admin: Admin, p: PendingUbtPurchase, sourceVaultId: string) => runTransaction(db, async t => {
        const purchaseRef = doc(pendingPurchasesCollection, p.id);
        const userRef = doc(usersCollection, p.userId);
        const sourceRef = doc(vaultsCollection, sourceVaultId);
        const econRef = doc(globalsCollection, 'economy');
        t.update(purchaseRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
        t.update(userRef, { ubtBalance: increment(p.amountUbt) });
        t.update(sourceRef, { balance: increment(-p.amountUbt) });
        t.update(econRef, { cvp_usd_backing: increment(p.amountUsd) }); 
        const txId = `bridge-${Date.now().toString(36)}`;
        t.set(doc(ledgerCollection, txId), { id: txId, senderId: sourceVaultId, receiverId: p.userId, amount: p.amountUbt, timestamp: Date.now(), type: 'FIAT_BRIDGE', protocol_mode: 'MAINNET', serverTimestamp: serverTimestamp() });
    }),
    rejectUbtPurchase: (id: string) => updateDoc(doc(pendingPurchasesCollection, id), { status: 'REJECTED' }),
    getPublicUserProfile: async (uid: string): Promise<PublicUserProfile | null> => {
        const userDoc = await getDoc(doc(usersCollection, uid));
        return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as PublicUserProfile : null;
    },
    getPublicUserProfilesByUids: async (uids: string[]): Promise<PublicUserProfile[]> => {
        if (uids.length === 0) return [];
        const results: PublicUserProfile[] = [];
        for (let i = 0; i < uids.length; i += 10) {
            const chunk = uids.slice(i, i + 10);
            const q = query(usersCollection, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile)));
        }
        return results;
    },
    searchUsers: async (queryStr: string, currentUser: User): Promise<PublicUserProfile[]> => {
        const q = query(usersCollection, where('name_lowercase', '>=', queryStr.toLowerCase()), where('name_lowercase', '<=', queryStr.toLowerCase() + '\uf8ff'), limit(15));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile)).filter(u => u.id !== currentUser.id);
    },
    resolveNodeIdentity: async (identifier: string): Promise<PublicUserProfile | null> => {
        const userDoc = await getDoc(doc(usersCollection, identifier));
        if (userDoc.exists()) return { id: userDoc.id, ...userDoc.data() } as PublicUserProfile;
        const vaultDoc = await getDoc(doc(vaultsCollection, identifier));
        if (vaultDoc.exists()) return { id: vaultDoc.id, name: vaultDoc.data()?.name, ubtBalance: vaultDoc.data()?.balance, role: 'admin', circle: 'TREASURY' } as any;
        return null;
    },

    createMeeting: async (u: User, title: string, expiresAt: Date): Promise<string> => {
        const id = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(meetingsCollection, id), {
            id, hostId: u.id, hostName: u.name, title,
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            participants: {
                [u.id]: { uid: u.id, name: u.name, isVideoOn: true, isMicOn: true, isSpeaking: false, role: u.role, joinedAt: Date.now() }
            }
        });
        return id;
    },
    joinMeeting: async (id: string): Promise<Meeting | null> => {
        const s = await getDoc(doc(meetingsCollection, id));
        return s.exists() ? { id: s.id, ...s.data() } as Meeting : null;
    },
    getHostActiveMeetings: async (uid: string): Promise<Meeting[]> => {
        const q = query(meetingsCollection, where('hostId', '==', uid), where('expiresAt', '>', Timestamp.now()));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Meeting));
    },
    updateMeetingSignal: (id: string, data: Partial<Meeting>) => updateDoc(doc(meetingsCollection, id), data),
    updateParticipantStatus: (id: string, uid: string, status: ParticipantStatus | null) => updateDoc(doc(meetingsCollection, id), { [`participants.${uid}`]: status }),
    listenForMeetingSignals: (id: string, cb: (m: Meeting) => void): Unsubscribe => onSnapshot(doc(meetingsCollection, id), s => s.exists() && cb({ id: s.id, ...s.data() } as Meeting)),
    addSignal: (meetingId: string, signal: RTCSignal) => addDoc(collection(db, 'meetings', meetingId, 'signals'), { ...signal, timestamp: Date.now() }),
    addIceCandidate: (meetingId: string, candidate: ICESignal) => addDoc(collection(db, 'meetings', meetingId, 'ice'), { ...candidate, timestamp: Date.now() }),
    listenForSignals: (meetingId: string, toUid: string, cb: (s: RTCSignal) => void): Unsubscribe => {
        return onSnapshot(query(collection(db, 'meetings', meetingId, 'signals'), where('to', '==', toUid)), s => {
            s.docChanges().forEach(change => { if (change.type === 'added') cb(change.doc.data() as RTCSignal); });
        });
    },
    listenForIce: (meetingId: string, toUid: string, cb: (c: ICESignal) => void): Unsubscribe => {
        return onSnapshot(query(collection(db, 'meetings', meetingId, 'ice'), where('to', '==', toUid)), s => {
            s.docChanges().forEach(change => { if (change.type === 'added') cb(change.doc.data() as ICESignal); });
        });
    },
    deleteMeeting: (id: string) => deleteDoc(doc(meetingsCollection, id)),

    listenForGlobalEconomy: (cb: (e: GlobalEconomy | null) => void, err?: (error: any) => void): Unsubscribe => onSnapshot(doc(globalsCollection, 'economy'), s => cb(s.exists() ? s.data() as GlobalEconomy : null), err),
    listenToVaults: (cb: (v: TreasuryVault[]) => void, err?: (error: any) => void): Unsubscribe => onSnapshot(vaultsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryVault))), err),
    listenForNotifications: (uid: string, cb: (n: Notification[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'users', uid, 'notifications'), orderBy('timestamp', 'desc'), limit(50)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Notification))), err),
    listenForUserTransactions: (uid: string, cb: (txs: Transaction[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'users', uid, 'transactions'), orderBy('timestamp', 'desc'), limit(50)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as any))), err),
    listenToUserVaults: (uid: string, cb: (v: any[]) => void): Unsubscribe => onSnapshot(query(collection(db, 'users', uid, 'vaults'), orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), console.error),
    listenForConversations: (uid: string, cb: (c: Conversation[]) => void, err?: any): Unsubscribe => onSnapshot(query(conversationsCollection, where('members', 'array-contains', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Conversation))), err),
    listenForMessages: (cid: string, u: User, cb: (m: Message[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, conversationsCollection.path, cid, 'messages'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Message))), err),
    listenForActivity: (circle: string, cb: (a: Activity[]) => void, err?: any): Unsubscribe => onSnapshot(query(activityCollection, where('causerCircle', '==', circle), orderBy('timestamp', 'desc'), limit(10)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), err),
    listenForAllUsers: (admin: User, cb: (u: User[]) => void, err?: any): Unsubscribe => onSnapshot(usersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), err),
    listenForAllMembers: (admin: User, cb: (m: Member[]) => void, err?: any): Unsubscribe => onSnapshot(membersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForAllAgents: (admin: User, cb: (a: Agent[]) => void, err?: any): Unsubscribe => onSnapshot(query(usersCollection, where('role', '==', 'agent')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Agent))), err),
    listenForPendingMembers: (admin: User, cb: (m: Member[]) => void, err?: any): Unsubscribe => onSnapshot(query(membersCollection, where('payment_status', '==', 'pending_verification')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForReports: (admin: User, cb: (r: any[]) => void, err?: any): Unsubscribe => onSnapshot(collection(db, 'reports'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), err),
    listenForPayoutRequests: (admin: User, cb: (r: PayoutRequest[]) => void, err?: any): Unsubscribe => onSnapshot(payoutsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),
    listenForPendingPurchases: (cb: (p: PendingUbtPurchase[]) => void, err?: any): Unsubscribe => onSnapshot(query(pendingPurchasesCollection, where('status', '==', 'PENDING')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PendingUbtPurchase))), err),
    listenForUserVentures: (uid: string, cb: (v: any[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'ventures'), where('ownerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), err),
    listenForUserPayouts: (uid: string, cb: (p: PayoutRequest[]) => void, err?: any): Unsubscribe => onSnapshot(query(payoutsCollection, where('userId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),
    listenForReferredUsers: (uid: string, cb: (u: PublicUserProfile[]) => void, err?: any): Unsubscribe => onSnapshot(query(usersCollection, where('referrerId', '==', uid)), s => cb(s.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile))), err),
    listenForProposals: (cb: (p: Proposal[]) => void, err?: any): Unsubscribe => onSnapshot(query(proposalsCollection, orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), err),
    listenToResources: (circle: string, cb: (r: CitizenResource[]) => void): Unsubscribe => onSnapshot(circle === 'ANY' ? resourcesCollection : query(resourcesCollection, where('circle', '==', circle)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as CitizenResource)))),
    listenToTribunals: (cb: (d: Dispute[]) => void): Unsubscribe => onSnapshot(query(disputesCollection, where('status', '==', 'TRIBUNAL')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Dispute)))),
    listenForVentures: (admin: User, cb: (v: Venture[]) => void, err?: any): Unsubscribe => onSnapshot(collection(db, 'ventures'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForCVP: (admin: User, cb: (c: CommunityValuePool | null) => void, err?: any): Unsubscribe => onSnapshot(doc(globalsCollection, 'cvp'), s => cb(s.exists() ? { id: s.id, ...s.data() } as CommunityValuePool : null), err),
    listenForFundraisingVentures: (cb: (v: Venture[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'ventures'), where('status', '==', 'fundraising')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForPostsByAuthor: (authorId: string, cb: (posts: Post[]) => void, err?: any): Unsubscribe => onSnapshot(query(postsCollection, where('authorId', '==', authorId), orderBy('date', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), err),
    listenForComments: (parentId: string, cb: (comments: Comment[]) => void, coll: 'posts' | 'proposals', err?: any): Unsubscribe => onSnapshot(query(collection(db, coll, parentId, 'comments'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment))), err),
    listenForMultiSigProposals: (cb: (p: MultiSigProposal[]) => void): Unsubscribe => onSnapshot(query(multisigCollection, where('status', '==', 'pending')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as MultiSigProposal))), console.error),

    initializeTreasury: async (admin: Admin) => {
        const batch = writeBatch(db);
        const vaults = [
            { id: 'GENESIS', name: 'Genesis Mother Node', type: 'GENESIS', balance: 15000000, description: 'Protocol asset root.' },
            { id: 'FLOAT', name: 'Social Float', type: 'FLOAT', balance: 0, description: 'Assets for peer exchange.' },
            { id: 'SUSTENANCE', name: 'Sustenance Reserve', type: 'SUSTENANCE', balance: 0, description: 'Dividend allocation node.' },
            { id: 'DISTRESS', name: 'Emergency Fund', type: 'DISTRESS', balance: 0, description: 'Social safety anchor.' },
            { id: 'VENTURE', name: 'Launchpad Treasury', type: 'VENTURE', balance: 0, description: 'Community growth capital.' }
        ];
        for (const v of vaults) {
            batch.set(doc(vaultsCollection, v.id), { ...v, publicKey: `UBT-VAULT-${v.id}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, isLocked: false });
        }
        const txId = `mint-${Date.now().toString(36)}`;
        batch.set(doc(ledgerCollection, txId), { id: txId, senderId: 'SYSTEM', receiverId: 'GENESIS', amount: 15000000, timestamp: Date.now(), type: 'SYSTEM_MINT', protocol_mode: 'MAINNET', senderPublicKey: 'ROOT_PROTOCOL', serverTimestamp: serverTimestamp() });
        await batch.commit();
    },
    toggleVaultLock: (id: string, lock: boolean) => updateDoc(doc(vaultsCollection, id), { isLocked: lock }),
    registerResource: (data: Partial<CitizenResource>) => addDoc(resourcesCollection, { ...data, createdAt: serverTimestamp() }),

    createPost: async (u: User, content: string, type: Post['types'], award: number, skills: string[] = []) => {
        return addDoc(postsCollection, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content, date: new Date().toISOString(), upvotes: [], types: type, requiredSkills: skills, commentCount: 0, repostCount: 0, ccapAwarded: award });
    },
    deletePost: (id: string) => deleteDoc(doc(postsCollection, id)),
    updatePost: (id: string, content: string) => updateDoc(doc(postsCollection, id), { content }),
    upvotePost: async (id: string, uid: string) => {
        const snap = await getDoc(doc(postsCollection, id));
        if (snap.exists()) {
            const upvotes = snap.data().upvotes || [];
            await updateDoc(doc(postsCollection, id), { upvotes: upvotes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid) });
        }
    },
    fetchPinnedPosts: async (isAdmin: boolean): Promise<Post[]> => {
        const q = query(postsCollection, where('isPinned', '==', true));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Post));
    },
    fetchRegularPosts: async (count: number, filter: string, isAdmin: boolean, startAfterDoc?: DocumentSnapshot<DocumentData>, currentUser?: User) => {
        let q;
        if (filter === 'all' || filter === 'foryou') q = query(postsCollection, orderBy('date', 'desc'), limit(count));
        else if (filter === 'following' && currentUser?.following && currentUser.following.length > 0) q = query(postsCollection, where('authorId', 'in', currentUser.following), orderBy('date', 'desc'), limit(count));
        else q = query(postsCollection, where('types', '==', filter), orderBy('date', 'desc'), limit(count));
        if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
        const s = await getDocs(q);
        return { posts: s.docs.map(d => ({ id: d.id, ...d.data() } as Post)), lastVisible: s.docs[s.docs.length - 1] };
    },
    togglePinPost: (admin: User, id: string, pin: boolean) => updateDoc(doc(postsCollection, id), { isPinned: pin }),
    addComment: (pid: string, data: any, coll: 'posts'|'proposals' = 'posts') => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, coll, pid, 'comments')), { ...data, timestamp: serverTimestamp() });
        batch.update(doc(db, coll, pid), { commentCount: increment(1) });
        return batch.commit();
    },
    deleteComment: (pid: string, cid: string, coll: 'posts'|'proposals') => deleteDoc(doc(db, coll, pid, 'comments', cid)),
    upvoteComment: async (pid: string, cid: string, uid: string, coll: 'posts'|'proposals' = 'posts') => {
        const ref = doc(db, coll, pid, 'comments', cid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const upvotes = snap.data().upvotes || [];
            await updateDoc(ref, { upvotes: upvotes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid) });
        }
    },
    startChat: async (u: User, t: PublicUserProfile): Promise<Conversation> => {
        const id = [u.id, t.id].sort().join('_');
        const snap = await getDoc(doc(conversationsCollection, id));
        if (snap.exists()) return { id: snap.id, ...snap.data() } as Conversation;
        const data = { members: [u.id, t.id], memberNames: { [u.id]: u.name, [t.id]: t.name }, lastMessage: "Handshake established", lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: u.id, readBy: [u.id], isGroup: false };
        await setDoc(doc(conversationsCollection, id), data);
        return { id, ...data } as Conversation;
    },
    markConversationAsRead: (id: string, uid: string) => updateDoc(doc(conversationsCollection, id), { readBy: arrayUnion(uid) }),
    sendMessage: async (id: string, msg: any, convo: Conversation) => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'conversations', id, 'messages')), { ...msg, timestamp: serverTimestamp() });
        batch.update(doc(conversationsCollection, id), { lastMessage: msg.text, lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: msg.senderId, readBy: [msg.senderId] });
        await batch.commit();
    },
    getVentureMembers: async (count: number) => {
        const q = query(usersCollection, where('isLookingForPartners', '==', true), limit(count));
        const s = await getDocs(q);
        return { users: s.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile)) };
    },
    getFundraisingVentures: async () => {
        const q = query(collection(db, 'ventures'), where('status', '==', 'fundraising'));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as any));
    },
    voteOnProposal: (pid: string, uid: string, v: 'for'|'against') => runTransaction(db, async t => {
        const ref = doc(proposalsCollection, pid);
        const snap = await t.get(ref);
        if (!snap.exists()) return;
        t.update(ref, { [v === 'for' ? 'votesFor' : 'votesAgainst']: arrayUnion(uid), [v === 'for' ? 'voteCountFor' : 'voteCountAgainst']: increment(1) });
    }),
    createPendingUbtPurchase: (u: User, val: number, amt: number) => addDoc(pendingPurchasesCollection, { userId: u.id, userName: u.name, amountUsd: val, amountUbt: amt, status: 'PENDING', createdAt: serverTimestamp(), payment_method: 'FIAT' }),
    updatePendingPurchaseReference: (purchaseId: string, ref: string) => updateDoc(doc(pendingPurchasesCollection, purchaseId), { ecocashRef: ref, status: 'AWAITING_CONFIRMATION' }),
    getAgentMembers: async (a: Agent) => {
        const q = query(membersCollection, where('agent_id', '==', a.id));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Member));
    },
    registerMember: async (a: Agent, d: NewMember) => {
        const welcome = await generateWelcomeMessage(d.full_name, d.circle);
        const ref = await addDoc(membersCollection, { ...d, agent_id: a.id, agent_name: a.name, date_registered: serverTimestamp(), welcome_message: welcome, membership_card_id: `UGC-M-${Math.random().toString(36).substring(2, 8).toUpperCase()}` });
        return { id: ref.id, ...d, agent_id: a.id, agent_name: a.name, welcome_message: welcome } as any;
    },
    sendBroadcast: (u: User, m: string) => addDoc(broadcastsCollection, { authorId: u.id, authorName: u.name, message: m, date: new Date().toISOString() }),
    getBroadcasts: async () => {
        const q = query(broadcastsCollection, orderBy('date', 'desc'), limit(10));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as any));
    },
    updateMemberAndUserProfile: async (uid: string, mid: string, uData: any, mData: any) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, uid), uData);
        batch.update(doc(membersCollection, mid), mData);
        await batch.commit();
    },
    unfollowUser: async (uid: string, tid: string) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, uid), { following: arrayRemove(tid) });
        batch.update(doc(usersCollection, tid), { followers: arrayRemove(uid) });
        await batch.commit();
    },
    followUser: async (u: User, tid: string) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, u.id), { following: arrayUnion(tid) });
        batch.update(doc(usersCollection, tid), { followers: arrayUnion(u.id) });
        await batch.commit();
    },
    reportUser: (r: User, t: User, reason: string, details: string) => addDoc(collection(db, 'reports'), { reporterId: r.id, reporterName: r.name, reportedUserId: t.id, reportedUserName: t.name, reason, details, date: new Date().toISOString(), status: 'new' }),
    markNotificationAsRead: (uid: string, nid: string) => updateDoc(doc(db, 'users', uid, 'notifications', nid), { read: true }),
    markAllNotificationsAsRead: async (uid: string) => {
        const q = query(collection(db, 'users', uid, 'notifications'), where('read', '==', false));
        const s = await getDocs(q);
        const batch = writeBatch(db);
        s.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },
    awardKnowledgePoints: (uid: string) => updateDoc(doc(usersCollection, uid), { hasReadKnowledgeBase: true, knowledgePoints: increment(10) }).then(() => true),
    getPublicLedger: async (l: number = 200) => {
        const s = await getDocs(query(ledgerCollection, orderBy('serverTimestamp', 'desc'), limit(l)));
        return s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
    },
    vouchForCitizen: (transaction: UbtTransaction) => runTransaction(db, async (t) => {
        const receiverRef = doc(usersCollection, transaction.receiverId);
        const econRef = doc(globalsCollection, 'economy');
        const econSnap = await t.get(econRef);
        const currentPrice = econSnap.exists() ? econSnap.data()?.ubt_to_usd_rate : 0.001;
        t.update(receiverRef, { credibility_score: increment(5), vouchCount: increment(1) });
        t.set(doc(ledgerCollection, transaction.id), { ...transaction, priceAtSync: currentPrice, serverTimestamp: serverTimestamp() });
    }),
    initiateDispute: (c: User, r: User, reason: string, evidence: string) => 
        addDoc(disputesCollection, { claimantId: c.id, claimantName: c.name, respondentId: r.id, respondentName: r.name, reason, evidence, status: 'TRIBUNAL', juryIds: [], votesForClaimant: 0, votesForRespondent: 0, signedVotes: {}, timestamp: serverTimestamp() }),
    castJuryVote: (did: string, uid: string, vote: string, signature: string) => 
        runTransaction(db, async t => {
            const ref = doc(disputesCollection, did);
            const snap = await t.get(ref);
            if (!snap.exists()) return;
            t.update(ref, { 
                juryIds: arrayUnion(uid), 
                [`signedVotes.${uid}`]: signature, 
                [vote === 'claimant' ? 'votesForClaimant' : 'votesForRespondent']: increment(1) 
            });
        }),
    processAdminHandshake: async (vid: string, rid: string | null, amt: number, tx: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const econRef = doc(globalsCollection, 'economy');
            const econSnap = await t.get(econRef);
            const currentPrice = econSnap.exists() ? econSnap.data()?.ubt_to_usd_rate : 0.001;
            t.update(doc(vaultsCollection, vid), { balance: increment(-amt) });
            if (rid && rid !== 'EXTERNAL_NODE') t.update(doc(usersCollection, rid), { ubtBalance: increment(amt) });
            t.set(doc(ledgerCollection, tx.id), { ...tx, priceAtSync: currentPrice, serverTimestamp: serverTimestamp() });
        });
    },

    sendDistressPost: async (u: User, content: string) => {
        return addDoc(postsCollection, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content, date: new Date().toISOString(), upvotes: [], types: 'distress', commentCount: 0, repostCount: 0 });
    },

    createGroupChat: async (name: string, members: string[], memberNames: {[key: string]: string}) => {
        return addDoc(conversationsCollection, { name, members, memberNames, lastMessage: "Group established", lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: 'SYSTEM', readBy: [], isGroup: true });
    },

    getGroupMembers: async (uids: string[]): Promise<MemberUser[]> => {
        const users = await api.getUsersByUids(uids);
        return users as MemberUser[];
    },

    updateGroupMembers: async (cid: string, members: string[], memberNames: {[key: string]: string}) => {
        return updateDoc(doc(conversationsCollection, cid), { members, memberNames });
    },

    leaveGroup: async (cid: string, uid: string) => {
        return updateDoc(doc(conversationsCollection, cid), { members: arrayRemove(uid) });
    },

    createProposal: async (u: User, data: { title: string, description: string }) => {
        return addDoc(proposalsCollection, { ...data, status: 'active', authorId: u.id, authorName: u.name, createdAt: serverTimestamp(), voteCountFor: 0, voteCountAgainst: 0, votesFor: [], votesAgainst: [] });
    },

    closeProposal: async (admin: User, pid: string, status: 'passed' | 'failed') => {
        return updateDoc(doc(proposalsCollection, pid), { status });
    },

    getCommunityValuePool: async (): Promise<CommunityValuePool> => {
        const snap = await getDoc(doc(globalsCollection, 'cvp'));
        if (!snap.exists()) throw new Error("CVP Offline");
        return { id: snap.id, ...snap.data() } as CommunityValuePool;
    },

    createVenture: async (v: any) => {
        return addDoc(collection(db, 'ventures'), { ...v, status: 'fundraising', createdAt: serverTimestamp(), fundingRaisedCcap: 0, backers: [], totalSharesIssued: 0, totalProfitsDistributed: 0, ticker: `VEQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}` });
    },

    getProposal: async (pid: string): Promise<Proposal | null> => {
        const snap = await getDoc(doc(proposalsCollection, pid));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Proposal : null;
    },

    getCurrentRedemptionCycle: async (): Promise<RedemptionCycle | null> => {
        const snap = await getDoc(doc(globalsCollection, 'redemption_cycle'));
        return snap.exists() ? { id: snap.id, ...snap.data() } as RedemptionCycle : null;
    },

    performDailyCheckin: async (uid: string) => {
        return runTransaction(db, async t => {
            const userRef = doc(usersCollection, uid);
            const userSnap = await t.get(userRef);
            if (!userSnap.exists()) return;
            const lastCheckin = userSnap.data().lastDailyCheckin;
            if (lastCheckin && (Date.now() - lastCheckin.toMillis()) < 24 * 60 * 60 * 1000) throw new Error("Check-in blocked.");
            t.update(userRef, { scap: increment(10), lastDailyCheckin: serverTimestamp() });
        });
    },

    submitPriceVerification: async (uid: string, item: string, price: number, shop: string) => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'price_verifications')), { userId: uid, item, price, shop, timestamp: serverTimestamp() });
        batch.update(doc(usersCollection, uid), { ccap: increment(15) });
        return batch.commit();
    },

    updatePayoutStatus: async (admin: Admin, payout: PayoutRequest, status: 'completed' | 'rejected') => {
        return updateDoc(doc(payoutsCollection, payout.id), { status, completedAt: serverTimestamp(), processedBy: { adminId: admin.id, adminName: admin.name } });
    },

    getVentureById: async (vid: string): Promise<Venture | null> => {
        const snap = await getDoc(doc(db, 'ventures', vid));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Venture : null;
    },

    getDistributionsForUserInVenture: async (uid: string, vid: string, shares: number, totalShares: number): Promise<Distribution[]> => {
        const q = query(collection(db, 'ventures', vid, 'distributions'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Distribution));
    },

    redeemCcapForCash: async (u: MemberUser, name: string, phone: string, amount: number, ccap: number, rate: number) => {
        const batch = writeBatch(db);
        batch.set(doc(payoutsCollection), { userId: u.id, userName: u.name, type: 'ccap_redemption', amount, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp(), meta: { ccapRedeemed: ccap, rate } });
        batch.update(doc(usersCollection, u.id), { ccap: increment(-ccap), lastCycleChoice: 'REDEEM' });
        return batch.commit();
    },

    stakeCcapForNextCycle: async (u: MemberUser) => {
        return updateDoc(doc(usersCollection, u.id), { lastCycleChoice: 'STAKE' });
    },

    convertCcapToVeq: async (u: MemberUser, v: Venture, ccap: number, rate: number) => {
        const shares = Math.floor(ccap * 10);
        const holding: VentureEquityHolding = { ventureId: v.id, ventureName: v.name, ventureTicker: v.ticker, shares };
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, u.id), { ccap: increment(-ccap), lastCycleChoice: 'INVEST', ventureEquity: arrayUnion(holding) });
        batch.update(doc(db, 'ventures', v.id), { fundingRaisedCcap: increment(ccap), backers: arrayUnion(u.id), totalSharesIssued: increment(shares) });
        return batch.commit();
    },

    getSustenanceFund: async (): Promise<SustenanceCycle | null> => {
        const snap = await getDoc(doc(globalsCollection, 'sustenance'));
        return snap.exists() ? { id: snap.id, ...snap.data() } as SustenanceCycle : null;
    },

    getAllSustenanceVouchers: async (): Promise<SustenanceVoucher[]> => {
        const snap = await getDocs(collection(db, 'vouchers'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher));
    },

    initializeSustenanceFund: async (admin: User, balance: number, cost: number) => {
        return setDoc(doc(globalsCollection, 'sustenance'), { slf_balance: balance, hamper_cost: cost, last_drop: serverTimestamp() });
    },

    runSustenanceLottery: async (admin: User) => {
        return { winners_count: 0 };
    },

    requestVeqPayout: async (u: User, h: VentureEquityHolding, shares: number, name: string, phone: string) => {
        return addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'veq_redemption', amount: shares, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: h.ventureId, ventureName: h.ventureName } });
    },

    addFundsToCVP: async (u: User, amount: number) => {
        return updateDoc(doc(globalsCollection, 'cvp'), { total_usd_value: increment(amount), last_updated: serverTimestamp() });
    },

    deleteVenture: async (u: User, vid: string) => {
        return deleteDoc(doc(db, 'ventures', vid));
    },

    claimBonusPayout: async (pid: string, name: string, phone: string) => {
        return updateDoc(doc(payoutsCollection, pid), { ecocashName: name, ecocashNumber: phone, status: 'pending' });
    },

    setGlobalEconomy: async (admin: Admin, data: Partial<GlobalEconomy>) => {
        return updateDoc(doc(globalsCollection, 'economy'), data);
    },

    updateUbtRedemptionWindow: async (admin: Admin, open: boolean) => {
        const data: any = { ubtRedemptionWindowOpen: open };
        if (open) {
            data.ubtRedemptionWindowStartedAt = serverTimestamp();
            const closesAt = new Date();
            closesAt.setDate(closesAt.getDate() + 5);
            data.ubtRedemptionWindowClosesAt = Timestamp.fromDate(closesAt);
        }
        return updateDoc(doc(globalsCollection, 'economy'), data);
    },

    updateUserUbt: async (admin: Admin, uid: string, amount: number, reason: string) => {
        return runTransaction(db, async t => {
            const userRef = doc(usersCollection, uid);
            const userSnap = await t.get(userRef);
            if (!userSnap.exists()) return;
            t.update(userRef, { ubtBalance: increment(amount) });
            const txId = `admin-${Date.now().toString(36)}`;
            t.set(doc(ledgerCollection, txId), { id: txId, senderId: 'SYSTEM', receiverId: uid, amount: Math.abs(amount), timestamp: Date.now(), reason, type: amount > 0 ? 'credit' : 'debit', protocol_mode: 'MAINNET', serverTimestamp: serverTimestamp() });
        });
    },

    requestUbtRedemption: async (u: User, amount: number, usd: number, name: string, phone: string) => {
        const batch = writeBatch(db);
        batch.set(doc(payoutsCollection), { userId: u.id, userName: u.name, type: 'ccap_redemption', amount: usd, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp(), meta: { ubtRedeemed: amount } });
        batch.update(doc(usersCollection, u.id), { ubtBalance: increment(-amount) });
        return batch.commit();
    },

    requestOnchainWithdrawal: async (u: User, amount: number, address: string) => {
        const batch = writeBatch(db);
        batch.set(doc(payoutsCollection), { userId: u.id, userName: u.name, type: 'onchain_withdrawal', amount, status: 'pending', requestedAt: serverTimestamp(), meta: { solanaAddress: address } });
        batch.update(doc(usersCollection, u.id), { ubtBalance: increment(-amount) });
        return batch.commit();
    },

    deleteDistressPost: async (admin: User, pid: string, authorId: string) => {
        const batch = writeBatch(db);
        batch.delete(doc(postsCollection, pid));
        batch.update(doc(usersCollection, authorId), { credibility_score: increment(-25) });
        return batch.commit();
    },

    reportPost: async (u: User, post: Post, reason: string, details: string) => {
        return addDoc(collection(db, 'reports'), { reporterId: u.id, reporterName: u.name, reportedUserId: post.authorId, reportedUserName: post.authorName, postId: post.id, postContent: post.content, reason, details, date: new Date().toISOString(), status: 'new' });
    },

    repostPost: async (orig: Post, u: User, comment: string) => {
        return addDoc(postsCollection, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content: comment, date: new Date().toISOString(), upvotes: [], types: 'general', repostedFrom: orig, commentCount: 0, repostCount: 0 });
    },

    proposeMultiSigSync: (admin: Admin, from: TreasuryVault, to: TreasuryVault, amount: number, reason: string) => {
        return addDoc(multisigCollection, {
            fromVaultId: from.id,
            toVaultId: to.id,
            amount,
            reason,
            proposerId: admin.id,
            proposerName: admin.name,
            signatures: [admin.id],
            status: 'pending',
            timestamp: serverTimestamp()
        });
    },

    signMultiSigProposal: (adminId: string, proposalId: string) => runTransaction(db, async t => {
        const ref = doc(multisigCollection, proposalId);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error("Proposal lost.");
        const data = snap.data() as MultiSigProposal;
        if (data.signatures.includes(adminId)) throw new Error("ALREADY_SIGNED");
        
        const newSigs = [...data.signatures, adminId];
        if (newSigs.length >= 2) {
            const fromRef = doc(vaultsCollection, data.fromVaultId);
            const toRef = doc(vaultsCollection, data.toVaultId);
            const fromSnap = await t.get(fromRef);
            if ((fromSnap.data()?.balance || 0) < data.amount) throw new Error("INSUFFICIENT_FUNDS_IN_VAULT");
            
            t.update(fromRef, { balance: increment(-data.amount) });
            t.update(toRef, { balance: increment(data.amount) });
            t.update(ref, { signatures: newSigs, status: 'executed' });
            
            const txId = `multisig-exec-${Date.now().toString(36)}`;
            t.set(doc(ledgerCollection, txId), { 
                id: txId, 
                senderId: data.fromVaultId, 
                receiverId: data.toVaultId, 
                amount: data.amount, 
                timestamp: Date.now(), 
                reason: `MultiSig: ${data.reason}`, 
                type: 'VAULT_SYNC', 
                protocol_mode: 'MAINNET', 
                serverTimestamp: serverTimestamp() 
            });
        } else {
            t.update(ref, { signatures: newSigs });
        }
    }),
};
