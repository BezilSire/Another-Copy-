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
import { 
    User, Agent, Member, NewMember, MemberUser, Post,
    Comment, Report, Conversation, Message, Notification, Activity,
    Proposal, PublicUserProfile, RedemptionCycle, PayoutRequest, SustenanceCycle, SustenanceVoucher, Venture, CommunityValuePool, VentureEquityHolding, 
    Distribution, Transaction, GlobalEconomy, Admin, UbtTransaction, TreasuryVault, PendingUbtPurchase, P2POffer, UserVault,
    CitizenResource, Dispute, Meeting, SellRequest
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
const p2pCollection = collection(db, 'p2p_offers');
const redemptionCyclesCollection = collection(db, 'redemption_cycles');
const sustenanceCollection = collection(db, 'sustenance_cycles');
const vouchersCollection = collection(db, 'sustenance_vouchers');
const venturesCollection = collection(db, 'ventures');

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
    updateUser: (uid: string, data: Partial<User>) => updateDoc(doc(db, 'users', uid), data),
    
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

    performDailyCheckin: (uid: string) => updateDoc(doc(usersCollection, uid), { scap: increment(10), lastDailyCheckin: serverTimestamp() }),
    submitPriceVerification: (uid: string, item: string, price: number, shop: string) => addDoc(collection(db, 'price_verifications'), { userId: uid, item, price, shop, date: serverTimestamp() }),
    requestPayout: (u: User, n: string, p: string, a: number) => addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'referral', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() }),
    requestCommissionPayout: (u: User, n: string, p: string, a: number) => addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'commission', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() }),
    requestUbtRedemption: (u: User, amt: number, val: number, n: string, p: string) => runTransaction(db, async t => {
        const payoutRef = doc(payoutsCollection);
        t.set(payoutRef, { userId: u.id, userName: u.name, type: 'ubt_redemption', amount: val, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp(), meta: { ubtAmount: amt, ubtToUsdRate: val / amt } });
        t.update(doc(usersCollection, u.id), { ubtBalance: increment(-amt) });
    }),
    requestOnchainWithdrawal: (u: User, amt: number, addr: string) => runTransaction(db, async t => {
        const payoutRef = doc(payoutsCollection);
        t.set(payoutRef, { userId: u.id, userName: u.name, type: 'onchain_withdrawal', amount: amt, status: 'pending', requestedAt: serverTimestamp(), meta: { solanaAddress: addr } });
        t.update(doc(usersCollection, u.id), { ubtBalance: increment(-amt) });
    }),
    updateUserUbt: (admin: Admin, uid: string, amt: number, reason: string) => runTransaction(db, async t => {
        t.update(doc(usersCollection, uid), { ubtBalance: increment(amt) });
        t.set(doc(collection(db, 'users', uid, 'transactions')), { type: amt > 0 ? 'credit' : 'debit', amount: Math.abs(amt), reason, timestamp: serverTimestamp(), actorId: admin.id, actorName: admin.name });
    }),
    processUbtTransaction: async (transaction: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const econRef = doc(globalsCollection, 'economy');
            const floatRef = doc(vaultsCollection, 'FLOAT');
            const isFloatSender = transaction.senderId === 'FLOAT';
            const senderRef = isFloatSender ? floatRef : doc(usersCollection, transaction.senderId);
            const receiverRef = doc(usersCollection, transaction.receiverId);
            const [econSnap, senderSnap] = await Promise.all([t.get(econRef), t.get(senderRef)]);
            const currentPrice = econSnap.exists() ? econSnap.data()?.ubt_to_usd_rate : 0.001;
            const balKey = isFloatSender ? 'balance' : 'ubtBalance';
            const senderBal = senderSnap.data()?.[balKey] || 0;
            if (senderBal < transaction.amount) throw new Error("INSUFFICIENT_LIQUIDITY");
            t.update(senderRef, { [balKey]: increment(-transaction.amount) });
            t.update(receiverRef, { ubtBalance: increment(transaction.amount) });
            t.set(doc(ledgerCollection, transaction.id), { ...transaction, priceAtSync: currentPrice, serverTimestamp: serverTimestamp() });
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
    }).then(() => api.syncEconomyOracle()),
    approveUbtPurchase: (admin: Admin, p: PendingUbtPurchase, sourceVaultId: 'FLOAT' | 'GENESIS' = 'FLOAT') => runTransaction(db, async t => {
        const purchaseRef = doc(pendingPurchasesCollection, p.id);
        const userRef = doc(usersCollection, p.userId);
        const sourceRef = doc(vaultsCollection, sourceVaultId);
        const econRef = doc(globalsCollection, 'economy');
        t.update(purchaseRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
        t.update(userRef, { ubtBalance: increment(p.amountUbt) });
        t.update(sourceRef, { balance: increment(-p.amountUbt) });
        t.update(econRef, { cvp_usd_backing: increment(p.amountUsd) }); 
        const txId = `bridge-${Date.now().toString(36)}`;
        t.set(doc(ledgerCollection, txId), { id: txId, senderId: sourceVaultId, receiverId: p.userId, amount: p.amountUbt, timestamp: Date.now(), type: p.payment_method === 'CRYPTO' ? 'CRYPTO_BRIDGE' : 'FIAT_BRIDGE', protocol_mode: 'MAINNET', serverTimestamp: serverTimestamp() });
    }).then(() => api.syncEconomyOracle()),
    rejectUbtPurchase: (id: string) => updateDoc(doc(pendingPurchasesCollection, id), { status: 'REJECTED' }),
    syncEconomyOracle: async () => {
        return runTransaction(db, async (t) => {
            const economyRef = doc(globalsCollection, 'economy');
            const floatRef = doc(vaultsCollection, 'FLOAT');
            const [econSnap, floatSnap] = await Promise.all([t.get(economyRef), t.get(floatRef)]);
            if (!econSnap.exists() || !floatSnap.exists()) return;
            const floatBal = floatSnap.data()?.balance || 1;
            const backing = econSnap.data()?.cvp_usd_backing || 1000;
            t.update(economyRef, { circulating_ubt: floatBal, ubt_to_usd_rate: backing / Math.max(1, floatBal), last_oracle_sync: serverTimestamp() });
        });
    },
    injectCVPUSD: async (amount: number) => {
        return updateDoc(doc(globalsCollection, 'economy'), { cvp_usd_backing: increment(amount) }).then(() => api.syncEconomyOracle());
    },
    addFundsToCVP: (admin: User, amount: number) => updateDoc(doc(globalsCollection, 'cvp'), { total_usd_value: increment(amount) }),
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
    listenForGlobalEconomy: (cb: (e: GlobalEconomy | null) => void, err?: (error: any) => void): Unsubscribe => onSnapshot(doc(globalsCollection, 'economy'), s => cb(s.exists() ? s.data() as GlobalEconomy : null), err),
    listenToVaults: (cb: (v: TreasuryVault[]) => void, err?: (error: any) => void): Unsubscribe => onSnapshot(vaultsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryVault))), err),
    listenForNotifications: (uid: string, cb: (n: Notification[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'users', uid, 'notifications'), orderBy('timestamp', 'desc'), limit(50)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Notification))), err),
    listenForUserTransactions: (uid: string, cb: (txs: Transaction[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'users', uid, 'notifications'), orderBy('timestamp', 'desc'), limit(50)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), err),
    listenToUserVaults: (uid: string, cb: (v: UserVault[]) => void): Unsubscribe => onSnapshot(query(collection(db, 'users', uid, 'vaults'), orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as UserVault))), console.error),
    listenForConversations: (uid: string, cb: (c: Conversation[]) => void, err?: any): Unsubscribe => onSnapshot(query(conversationsCollection, where('members', 'array-contains', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Conversation))), err),
    listenForMessages: (cid: string, u: User, cb: (m: Message[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'conversations', cid, 'messages'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Message))), err),
    listenForComments: (pid: string, cb: (c: Comment[]) => void, coll: 'posts'|'proposals' = 'posts', err?: any): Unsubscribe => onSnapshot(query(collection(db, coll, pid, 'comments'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment))), err),
    listenForPostsByAuthor: (aid: string, cb: (p: Post[]) => void, err?: any): Unsubscribe => onSnapshot(query(postsCollection, where('authorId', '==', aid), orderBy('date', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), err),
    listenForActivity: (circle: string, cb: (a: Activity[]) => void, err?: any): Unsubscribe => onSnapshot(query(activityCollection, where('causerCircle', '==', circle), orderBy('timestamp', 'desc'), limit(10)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), err),
    listenForAllUsers: (admin: User, cb: (u: User[]) => void, err?: any): Unsubscribe => onSnapshot(usersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), err),
    listenForAllMembers: (admin: User, cb: (m: Member[]) => void, err?: any): Unsubscribe => onSnapshot(membersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForAllAgents: (admin: User, cb: (a: Agent[]) => void, err?: any): Unsubscribe => onSnapshot(query(usersCollection, where('role', '==', 'agent')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Agent))), err),
    listenForPendingMembers: (admin: User, cb: (m: Member[]) => void, err?: any): Unsubscribe => onSnapshot(query(membersCollection, where('payment_status', '==', 'pending_verification')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForReports: (admin: User, cb: (r: Report[]) => void, err?: any): Unsubscribe => onSnapshot(reportsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))), err),
    listenForPayoutRequests: (admin: User, cb: (r: PayoutRequest[]) => void, err?: any): Unsubscribe => onSnapshot(payoutsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),
    listenForPendingPurchases: (cb: (p: PendingUbtPurchase[]) => void, err?: any): Unsubscribe => onSnapshot(query(pendingPurchasesCollection, where('status', '==', 'PENDING')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PendingUbtPurchase))), err),
    listenToP2POffers: (cb: (o: P2POffer[]) => void, err?: any): Unsubscribe => onSnapshot(query(p2pCollection, where('status', '==', 'OPEN')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as P2POffer))), err),
    listenForCVP: (admin: User, cb: (cvp: CommunityValuePool | null) => void, err?: any): Unsubscribe => onSnapshot(doc(globalsCollection, 'cvp'), s => cb(s.exists() ? s.data() as CommunityValuePool : null), err),
    listenForVentures: (admin: User, cb: (v: Venture[]) => void, err?: any): Unsubscribe => onSnapshot(venturesCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForFundraisingVentures: (cb: (v: Venture[]) => void, err?: any): Unsubscribe => onSnapshot(query(venturesCollection, where('status', '==', 'fundraising')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForUserVentures: (uid: string, cb: (v: Venture[]) => void, err?: any): Unsubscribe => onSnapshot(query(venturesCollection, where('ownerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForUserPayouts: (uid: string, cb: (p: PayoutRequest[]) => void, err?: any): Unsubscribe => onSnapshot(query(payoutsCollection, where('userId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),
    listenForReferredUsers: (uid: string, cb: (u: PublicUserProfile[]) => void, err?: any): Unsubscribe => onSnapshot(query(usersCollection, where('referrerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile))), err),
    listenForProposals: (cb: (p: Proposal[]) => void, err?: any): Unsubscribe => onSnapshot(query(proposalsCollection, orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), err),
    listenToResources: (circle: string, cb: (r: CitizenResource[]) => void): Unsubscribe => onSnapshot(circle === 'ANY' ? resourcesCollection : query(resourcesCollection, where('circle', '==', circle)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as CitizenResource)))),
    listenToTribunals: (cb: (d: Dispute[]) => void): Unsubscribe => onSnapshot(query(disputesCollection, where('status', '==', 'TRIBUNAL')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Dispute)))),

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
        const txId = `genesis-mint-${Date.now().toString(36)}`;
        batch.set(doc(ledgerCollection, txId), { id: txId, senderId: 'SYSTEM', receiverId: 'GENESIS', amount: 15000000, timestamp: Date.now(), type: 'SYSTEM_MINT', protocol_mode: 'MAINNET', senderPublicKey: 'ROOT_PROTOCOL', serverTimestamp: serverTimestamp() });
        await batch.commit();
        await api.syncEconomyOracle();
    },
    toggleVaultLock: (id: string, lock: boolean) => updateDoc(doc(vaultsCollection, id), { isLocked: lock }),
    registerResource: (data: Partial<CitizenResource>) => addDoc(resourcesCollection, { ...data, createdAt: serverTimestamp() }),

    createMeeting: async (u: User, title: string, expiresAt: Date): Promise<string> => {
        const id = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(db, 'meetings', id), {
            id,
            hostId: u.id,
            hostName: u.name,
            title,
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
        });
        return id;
    },
    
    joinMeeting: async (id: string): Promise<Meeting | null> => {
        const s = await getDoc(doc(db, 'meetings', id));
        return s.exists() ? { id: s.id, ...s.data() } as Meeting : null;
    },
    
    updateMeetingSignal: (id: string, data: Partial<Meeting>) => updateDoc(doc(db, 'meetings', id), data),
    
    listenForMeetingSignals: (id: string, cb: (m: Meeting) => void): Unsubscribe => onSnapshot(doc(db, 'meetings', id), s => s.exists() && cb({ id: s.id, ...s.data() } as Meeting)),
    
    addIceCandidate: (id: string, type: 'caller' | 'callee', candidate: any) => addDoc(collection(db, 'meetings', id, type === 'caller' ? 'callerCandidates' : 'calleeCandidates'), candidate),
    
    listenForIceCandidates: (id: string, type: 'caller' | 'callee', cb: (c: any) => void): Unsubscribe => onSnapshot(collection(db, 'meetings', id, type === 'caller' ? 'callerCandidates' : 'calleeCandidates'), s => {
        s.docChanges().forEach(change => {
            if (change.type === 'added') cb(change.doc.data());
        });
    }),
    
    deleteMeeting: (id: string) => deleteDoc(doc(db, 'meetings', id)),

    createPost: async (u: User, content: string, type: Post['types'], award: number, skills: string[] = []) => addDoc(postsCollection, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content, date: new Date().toISOString(), upvotes: [], types: type, requiredSkills: skills, commentCount: 0, repostCount: 0, ccapAwarded: award }),
    repostPost: async (original: Post, u: User, comment: string) => {
        const batch = writeBatch(db);
        batch.set(doc(postsCollection), { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content: comment, date: new Date().toISOString(), upvotes: [], types: 'general', repostedFrom: { authorId: original.authorId, authorName: original.authorName, authorCircle: original.authorCircle, content: original.content, date: original.date } });
        batch.update(doc(postsCollection, original.id), { repostCount: increment(1) });
        await batch.commit();
    },
    deletePost: (id: string) => _deletePostAndSubcollections(id),
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
        if (filter === 'all') q = query(postsCollection, orderBy('date', 'desc'), limit(count));
        else if (filter === 'foryou' && currentUser?.interests) q = query(postsCollection, where('authorInterests', 'array-contains-any', currentUser.interests), orderBy('date', 'desc'), limit(count));
        else if (filter === 'following' && currentUser?.following && currentUser.following.length > 0) q = query(postsCollection, where('authorId', 'in', currentUser.following), orderBy('date', 'desc'), limit(count));
        else q = query(postsCollection, where('types', '==', filter), orderBy('date', 'desc'), limit(count));
        if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
        const s = await getDocs(q);
        return { posts: s.docs.map(d => ({ id: d.id, ...d.data() } as Post)), lastVisible: s.docs[s.docs.length - 1] };
    },
    togglePinPost: (admin: User, id: string, pin: boolean) => updateDoc(doc(postsCollection, id), { isPinned: pin }),
    sendDistressPost: async (u: MemberUser, content: string) => addDoc(postsCollection, { authorId: u.id, authorName: 'Anonymous Member', authorCircle: u.circle, authorRole: u.role, content, date: new Date().toISOString(), upvotes: [], types: 'distress' }),
    deleteDistressPost: (admin: User, pid: string, uid: string) => deleteDoc(doc(postsCollection, pid)),
    reportPost: (u: User, post: Post, reason: string, details: string) => addDoc(reportsCollection, { reporterId: u.id, reporterName: u.name, reportedUserId: post.authorId, reportedUserName: post.authorName, postId: post.id, postContent: post.content, postAuthorId: post.authorId, reason, details, date: new Date().toISOString(), status: 'new' }),
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
        const data = { members: [u.id, t.id], memberNames: { [u.id]: u.name, [t.id]: t.name }, lastMessage: "Handshake initialized", lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: u.id, readBy: [u.id], isGroup: false };
        await setDoc(doc(conversationsCollection, id), data);
        return { id, ...data } as Conversation;
    },
    createGroupChat: async (name: string, members: string[], names: Record<string, string>) => addDoc(conversationsCollection, { name, members, memberNames: names, lastMessage: "Group established", lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: members[0], readBy: [members[0]], isGroup: true }),
    markConversationAsRead: (id: string, uid: string) => updateDoc(doc(conversationsCollection, id), { readBy: arrayUnion(uid) }),
    sendMessage: async (id: string, msg: any, convo: Conversation) => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'conversations', id, 'messages')), { ...msg, timestamp: serverTimestamp() });
        batch.update(doc(conversationsCollection, id), { lastMessage: msg.text, lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: msg.senderId, readBy: [msg.senderId] });
        await batch.commit();
    },
    getGroupMembers: async (ids: string[]): Promise<MemberUser[]> => {
        if (ids.length === 0) return [];
        const results: MemberUser[] = [];
        for (let i = 0; i < ids.length; i += 10) {
            const chunk = ids.slice(i, i + 10);
            const q = query(usersCollection, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberUser)));
        }
        return results;
    },
    updateGroupMembers: (id: string, ids: string[], names: any) => updateDoc(doc(conversationsCollection, id), { members: ids, memberNames: names }),
    leaveGroup: (id: string, uid: string) => updateDoc(doc(conversationsCollection, id), { members: arrayRemove(uid) }),
    createVenture: (data: any) => addDoc(venturesCollection, { ...data, status: 'fundraising', createdAt: serverTimestamp(), fundingRaisedCcap: 0, backers: [], totalSharesIssued: 10000, totalProfitsDistributed: 0 }),
    getVentureById: async (id: string) => { const s = await getDoc(doc(venturesCollection, id)); return s.exists() ? { id: s.id, ...s.data() } as Venture : null; },
    deleteVenture: (u: User, id: string) => deleteDoc(doc(venturesCollection, id)),
    getVentureMembers: async (count: number) => {
        const q = query(usersCollection, where('isLookingForPartners', '==', true), limit(count));
        const s = await getDocs(q);
        return { users: s.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile)) };
    },
    getFundraisingVentures: async () => {
        const q = query(venturesCollection, where('status', '==', 'fundraising'));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Venture));
    },
    getDistributionsForUserInVenture: async (uid: string, vid: string, shares: number, total: number): Promise<Distribution[]> => {
        const q = query(collection(db, 'ventures', vid, 'distributions'), orderBy('date', 'desc'));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Distribution));
    },
    createProposal: (u: User, d: any) => addDoc(proposalsCollection, { ...d, authorId: u.id, authorName: u.name, createdAt: serverTimestamp(), status: 'active', votesFor: [], votesAgainst: [], voteCountFor: 0, voteCountAgainst: 0 }),
    closeProposal: (u: User, id: string, status: string) => updateDoc(doc(proposalsCollection, id), { status }),
    voteOnProposal: (pid: string, uid: string, v: 'for'|'against') => runTransaction(db, async t => {
        const ref = doc(proposalsCollection, pid);
        const snap = await t.get(ref);
        if (!snap.exists()) return;
        const d = snap.data() as Proposal;
        if (d.votesFor.includes(uid) || d.votesAgainst.includes(uid)) throw new Error("already voted");
        t.update(ref, { [v === 'for' ? 'votesFor' : 'votesAgainst']: arrayUnion(uid), [v === 'for' ? 'voteCountFor' : 'voteCountAgainst']: increment(1) });
    }),
    getProposal: async (id: string) => { const s = await getDoc(doc(proposalsCollection, id)); return s.exists() ? { id: s.id, ...s.data() } as Proposal : null; },
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
    sendBroadcast: (u: User, m: string) => addDoc(collection(db, 'broadcasts'), { authorId: u.id, authorName: u.name, message: m, date: new Date().toISOString() }),
    getBroadcasts: async () => {
        const q = query(collection(db, 'broadcasts'), orderBy('date', 'desc'), limit(10));
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
    reportUser: (r: User, t: User, reason: string, details: string) => addDoc(reportsCollection, { reporterId: r.id, reporterName: r.name, reportedUserId: t.id, reportedUserName: t.name, reason, details, date: new Date().toISOString(), status: 'new' }),
    markNotificationAsRead: (uid: string, nid: string) => updateDoc(doc(db, 'users', uid, 'notifications', nid), { read: true }),
    markAllNotificationsAsRead: async (uid: string) => {
        const q = query(collection(db, 'users', uid, 'notifications'), where('read', '==', false));
        const s = await getDocs(q);
        const batch = writeBatch(db);
        s.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },
    awardKnowledgePoints: (uid: string) => updateDoc(doc(usersCollection, uid), { hasReadKnowledgeBase: true, knowledgePoints: increment(10) }).then(() => true),
    getCommunityValuePool: async () => {
        const s = await getDoc(doc(globalsCollection, 'economy'));
        if (!s.exists()) throw new Error("CVP offline.");
        const data = s.data();
        return { id: 'cvp', total_usd_value: data?.cvp_usd_backing || 0, total_circulating_ccap: data?.circulating_ubt || 0, ccap_to_usd_rate: data?.ubt_to_usd_rate || 0.001 } as CommunityValuePool;
    },
    getCurrentRedemptionCycle: async () => {
        const q = query(redemptionCyclesCollection, orderBy('endDate', 'desc'), limit(1));
        const s = await getDocs(q);
        return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() } as RedemptionCycle;
    },
    updatePayoutStatus: (admin: User, payout: PayoutRequest, status: string) => updateDoc(doc(payoutsCollection, payout.id), { status, processedBy: { adminId: admin.id, adminName: admin.name }, completedAt: serverTimestamp() }),
    redeemCcapForCash: (u: User, n: string, p: string, v: number, c: number, r: number) => runTransaction(db, async t => {
        t.set(doc(payoutsCollection), { userId: u.id, userName: u.name, type: 'ccap_redemption', amount: v, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp(), meta: { ccapAmount: c, ccap_to_usd_rate: r } });
        t.update(doc(usersCollection, u.id), { currentCycleCcap: 0, lastCycleChoice: 'redeemed' });
    }),
    stakeCcapForNextCycle: (u: User) => updateDoc(doc(usersCollection, u.id), { currentCycleCcap: 0, stakedCcap: increment((u.currentCycleCcap || 0) * 1.1), lastCycleChoice: 'staked' }),
    convertCcapToVeq: (u: User, v: Venture, c: number, r: number) => runTransaction(db, async t => {
        const shares = Math.floor(c * r * 100);
        t.update(doc(usersCollection, u.id), { currentCycleCcap: 0, lastCycleChoice: 'invested', ventureEquity: arrayUnion({ ventureId: v.id, ventureName: v.name, ventureTicker: v.ticker, shares }) });
        t.update(doc(venturesCollection, v.id), { fundingRaisedCcap: increment(c), backers: arrayUnion(u.id) });
    }),
    getSustenanceFund: async () => {
        const s = await getDoc(doc(sustenanceCollection, 'current'));
        return s.exists() ? s.data() as SustenanceCycle : null;
    },
    getAllSustenanceVouchers: async () => {
        const s = await getDocs(query(vouchersCollection, orderBy('issuedAt', 'desc'), limit(100)));
        return s.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher));
    },
    initializeSustenanceFund: (u: User, b: number, c: number) => setDoc(doc(sustenanceCollection, 'current'), { slf_balance: b, hamper_cost: c, last_run: serverTimestamp(), next_run: serverTimestamp() }),
    runSustenanceLottery: (u: User): Promise<{ winners_count: number }> => Promise.resolve({ winners_count: 0 }),
    requestVeqPayout: (u: User, h: VentureEquityHolding, s: number, n: string, p: string) => addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'veq_redemption', amount: s, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: h.ventureId, ventureName: h.ventureName } }),
    claimBonusPayout: (id: string, n: string, p: string) => updateDoc(doc(payoutsCollection, id), { ecocashName: n, ecocashNumber: p, status: 'pending' }),
    updateUbtRedemptionWindow: (u: User, open: boolean) => {
        const ref = doc(globalsCollection, 'economy');
        if (open) {
            const now = Timestamp.now();
            const close = new Date(now.toDate());
            close.setDate(close.getDate() + 5);
            return setDoc(ref, { ubtRedemptionWindowOpen: true, ubtRedemptionWindowStartedAt: now, ubtRedemptionWindowClosesAt: Timestamp.fromDate(close) }, { merge: true });
        }
        return setDoc(ref, { ubtRedemptionWindowOpen: false, ubtRedemptionWindowClosesAt: null }, { merge: true });
    },
    setGlobalEconomy: (u: User, d: any) => setDoc(doc(globalsCollection, 'economy'), d, { merge: true }),
    getPublicLedger: async (l: number = 200) => {
        const s = await getDocs(query(ledgerCollection, orderBy('serverTimestamp', 'desc'), limit(l)));
        return s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
    },
    getUserLedger: async (uid: string) => {
        const q1 = query(ledgerCollection, where('senderId', '==', uid));
        const q2 = query(ledgerCollection, where('receiverId', '==', uid));
        const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const res = [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
        return Array.from(new Map(res.map(i => [i.id, i])).values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
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

    /**
     * Creates a new sell request for a member wanting to liquidate UBT.
     */
    createSellRequest: (user: User, amountUbt: number, amountUsd: number) => addDoc(collection(db, 'sell_requests'), {
        userId: user.id,
        userName: user.name,
        userPhone: user.phone || '',
        amountUbt,
        amountUsd,
        status: 'PENDING',
        createdAt: serverTimestamp()
    }),

    /**
     * Marks a sell request as claimed by a facilitator or the treasury.
     */
    claimSellRequest: (claimer: User, requestId: string) => updateDoc(doc(db, 'sell_requests', requestId), {
        status: 'CLAIMED',
        claimerId: claimer.id,
        claimerName: claimer.name,
        claimerRole: claimer.role,
        claimedAt: serverTimestamp()
    }),

    /**
     * Confirms that the payment has been dispatched to the member's Ecocash.
     */
    dispatchSellPayment: (claimer: User, requestId: string, ref: string) => updateDoc(doc(db, 'sell_requests', requestId), {
        status: 'DISPATCHED',
        ecocashRef: ref,
        dispatchedAt: serverTimestamp()
    }),

    /**
     * Listen to active sell requests for the bounty board and treasury HUD.
     */
    listenToSellRequests: (cb: (r: SellRequest[]) => void, err?: any): Unsubscribe => onSnapshot(query(collection(db, 'sell_requests'), orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest))), err),
};
