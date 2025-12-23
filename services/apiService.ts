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
    User, Agent, Member, NewMember, MemberUser, Broadcast, Post,
    Comment, Report, Conversation, Message, Notification, Activity,
    Proposal, PublicUserProfile, RedemptionCycle, PayoutRequest, SustenanceCycle, SustenanceVoucher, Venture, CommunityValuePool, VentureEquityHolding, 
    Distribution, Transaction, GlobalEconomy, Admin, UbtTransaction, UserVault, TreasuryVault, PendingUbtPurchase, SellRequest, P2POffer
} from '../types';
import { cryptoService } from './cryptoService';

const usersCollection = collection(db, 'users');
const membersCollection = collection(db, 'members');
const postsCollection = collection(db, 'posts');
const broadcastsCollection = collection(db, 'broadcasts');
const reportsCollection = collection(db, 'reports');
const conversationsCollection = collection(db, 'conversations');
const activityCollection = collection(db, 'activity');
const proposalsCollection = collection(db, 'proposals');
const redemptionCyclesCollection = collection(db, 'redemption_cycles');
const payoutsCollection = collection(db, 'payouts');
const sustenanceCollection = collection(db, 'sustenance_cycles');
const vouchersCollection = collection(db, 'sustenance_vouchers');
const venturesCollection = collection(db, 'ventures');
const globalsCollection = collection(db, 'globals');
const ledgerCollection = collection(db, 'ledger');
const p2pCollection = collection(db, 'p2p_offers');
const pendingPurchasesCollection = collection(db, 'pending_ubt_purchases');
const sellRequestsCollection = collection(db, 'sell_requests');
const vaultsCollection = collection(db, 'treasury_vaults');

const getMillis = (val: any): number => {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (val instanceof Timestamp) return val.toMillis();
    if (val instanceof Date) return val.getTime();
    if (val.seconds !== undefined) return val.seconds * 1000;
    const date = new Date(val);
    return isNaN(date.getTime()) ? 0 : date.getTime();
};

const _deletePostAndSubcollections = async (postId: string) => {
    const postRef = doc(postsCollection, postId);
    const commentsSnapshot = await getDocs(collection(db, 'posts', postId, 'comments'));
    const batch = writeBatch(db);
    commentsSnapshot.forEach(doc => { batch.delete(doc.ref); });
    batch.delete(postRef);
    await batch.commit();
};

export const api = {
    // --- AUTHENTICATION & PRESENCE ---
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

    // --- USER MANAGEMENT ---
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
    getUsersByUids: async (uids: string[]): Promise<User[]> => {
        if (uids.length === 0) return [];
        const promises = [];
        for (let i = 0; i < uids.length; i += 30) {
            const chunk = uids.slice(i, i + 30);
            const q = query(usersCollection, where('__name__', 'in', chunk));
            promises.push(getDocs(q));
        }
        const snapshots = await Promise.all(promises);
        const users: User[] = [];
        snapshots.forEach(snapshot => { snapshot.docs.forEach(doc => { users.push({ id: doc.id, ...doc.data() } as User); }); });
        return users;
    },
    updateUser: (uid: string, data: Partial<User>) => updateDoc(doc(db, 'users', uid), data),
    updateMemberAndUserProfile: async (userId: string, memberId: string, userUpdateData: Partial<User>, memberUpdateData: Partial<Member>) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, userId), userUpdateData);
        batch.update(doc(membersCollection, memberId), memberUpdateData);
        await batch.commit();
    },
    getPublicUserProfile: async (uid: string): Promise<PublicUserProfile | null> => {
        const userDoc = await getDoc(doc(usersCollection, uid));
        if (!userDoc.exists()) return null;
        return { id: userDoc.id, ...userDoc.data() } as PublicUserProfile;
    },
    getPublicUserProfilesByUids: async (uids: string[]): Promise<PublicUserProfile[]> => {
        if (uids.length === 0) return [];
        const q = query(usersCollection, where('__name__', 'in', uids.slice(0, 30)));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
    },
    searchUsers: async (searchQuery: string, currentUser: User): Promise<PublicUserProfile[]> => {
        if (!searchQuery.trim()) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        const q = query(usersCollection, where('name_lowercase', '>=', lowerCaseQuery), where('name_lowercase', '<=', lowerCaseQuery + '\uf8ff'), limit(15));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile)).filter(u => u.id !== currentUser.id);
    },
    resolveNodeIdentity: async (identifier: string): Promise<PublicUserProfile | null> => {
        if (!identifier) return null;
        const directDoc = await getDoc(doc(db, 'users', identifier));
        if (directDoc.exists()) return { id: directDoc.id, ...directDoc.data() } as PublicUserProfile;
        const q = query(usersCollection, where('publicKey', '==', identifier), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PublicUserProfile;
        const vaultDoc = await getDoc(doc(vaultsCollection, identifier));
        if (vaultDoc.exists()) return { id: vaultDoc.id, name: vaultDoc.data()?.name, ubtBalance: vaultDoc.data()?.balance, role: 'admin', circle: 'TREASURY' } as any;
        return null;
    },

    // --- PROTOCOL TRANSACTIONS & LEDGER ---
    processUbtTransaction: async (transaction: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const senderRef = doc(usersCollection, transaction.senderId);
            const receiverRef = doc(usersCollection, transaction.receiverId);
            const senderDoc = await t.get(senderRef);
            if (!senderDoc.exists()) throw new Error("Sender node offline.");
            const currentBalance = senderDoc.data().ubtBalance || 0;
            if (currentBalance < transaction.amount) throw new Error("Insufficient node liquidity.");
            const isValid = cryptoService.verifySignature(transaction.hash, transaction.signature, transaction.senderPublicKey || "");
            if (!isValid) throw new Error("Protocol Signature Fault.");

            t.update(senderRef, { ubtBalance: increment(-transaction.amount) });
            t.update(receiverRef, { ubtBalance: increment(transaction.amount) });
            const ledgerRef = doc(ledgerCollection, transaction.id);
            t.set(ledgerRef, { ...transaction, serverTimestamp: serverTimestamp() });
            
            const senderTxRef = doc(collection(db, 'users', transaction.senderId, 'transactions'), transaction.id);
            const receiverTxRef = doc(collection(db, 'users', transaction.receiverId, 'transactions'), transaction.id);
            t.set(senderTxRef, { type: 'p2p_sent', amount: transaction.amount, reason: 'Dispatched UBT', timestamp: serverTimestamp(), actorId: transaction.senderId, txHash: transaction.id, protocol_mode: 'MAINNET' });
            t.set(receiverTxRef, { type: 'p2p_received', amount: transaction.amount, reason: 'Synced UBT', timestamp: serverTimestamp(), actorId: transaction.senderId, txHash: transaction.id, protocol_mode: 'MAINNET' });
        });
    },
    processAdminHandshake: async (vaultId: string, receiverId: string | null, amount: number, transaction: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const vaultRef = doc(vaultsCollection, vaultId);
            const vaultDoc = await t.get(vaultRef);
            if (!vaultDoc.exists()) throw new Error("Origin vault offline.");
            if ((vaultDoc.data()?.balance || 0) < amount) throw new Error("Insufficient assets.");
            t.update(vaultRef, { balance: increment(-amount) });
            if (receiverId && receiverId !== 'EXTERNAL_NODE') {
                const receiverRef = doc(usersCollection, receiverId);
                t.update(receiverRef, { ubtBalance: increment(amount) });
                const receiverTxRef = doc(collection(db, 'users', receiverId, 'transactions'), transaction.id);
                t.set(receiverTxRef, { type: 'p2p_received', amount, reason: 'Treasury Allocation', timestamp: serverTimestamp(), actorId: 'TREASURY', txHash: transaction.id, protocol_mode: 'MAINNET' });
            }
            t.set(doc(ledgerCollection, transaction.id), { ...transaction, serverTimestamp: serverTimestamp() });
        });
    },
    getPublicLedger: async (limitCount: number = 200): Promise<UbtTransaction[]> => {
        const q = query(ledgerCollection, orderBy('serverTimestamp', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as UbtTransaction))
            .filter(tx => {
                if (tx.protocol_mode === 'TESTNET') return false;
                if (tx.id.startsWith('sim-') || tx.id.startsWith('test-')) return false;
                if (tx.senderId === 'PROTOCOL_ROOT' || tx.senderPublicKey === 'SYSTEM_SIMULATOR') return false;
                if (tx.amount === 10000 && (tx.receiverId === 'bDKcFBzV2VdCGb2m1DPOph0WCHk1' || tx.receiverId === 'BWy31FSiXgWIjqHoUsJ378yTOLj2')) return false;
                return true;
            });
    },
    listenForUserTransactions: (userId: string, callback: (txs: Transaction[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(collection(db, 'users', userId, 'transactions'), orderBy('timestamp', 'desc'), limit(50)), (s) => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), onError),
    listenForGlobalEconomy: (callback: (economy: GlobalEconomy | null) => void, onError: (error: Error) => void) => 
        onSnapshot(doc(globalsCollection, 'economy'), (s) => callback(s.exists() ? s.data() as GlobalEconomy : null), onError),

    // --- SOCIAL & NETWORK ---
    followUser: async (follower: User, targetUserId: string) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, follower.id), { following: arrayUnion(targetUserId) });
        batch.update(doc(usersCollection, targetUserId), { followers: arrayUnion(follower.id) });
        batch.set(doc(collection(db, 'users', targetUserId, 'notifications')), {
            userId: targetUserId, message: `${follower.name} started following you.`, link: follower.id, read: false, timestamp: serverTimestamp(), type: 'NEW_FOLLOWER', causerId: follower.id
        });
        await batch.commit();
    },
    unfollowUser: async (followerId: string, targetUserId: string) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, followerId), { following: arrayRemove(targetUserId) });
        batch.update(doc(usersCollection, targetUserId), { followers: arrayRemove(followerId) });
        await batch.commit();
    },
    listenForNotifications: (userId: string, callback: (notifs: Notification[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(collection(db, 'users', userId, 'notifications'), orderBy('timestamp', 'desc'), limit(50)), (s) => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Notification))), onError),
    markNotificationAsRead: (userId: string, notificationId: string) => updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true }),
    markAllNotificationsAsRead: async (userId: string) => {
        const q = query(collection(db, 'users', userId, 'notifications'), where('read', '==', false));
        const s = await getDocs(q);
        const batch = writeBatch(db);
        s.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },
    listenForActivity: (circle: string, callback: (acts: Activity[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(activityCollection, where('causerCircle', '==', circle), orderBy('timestamp', 'desc'), limit(10)), (s) => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), onError),

    reportUser: (reporter: User, reportedUser: PublicUserProfile, reason: string, details: string) => 
        addDoc(reportsCollection, { reporterId: reporter.id, reporterName: reporter.name, reportedUserId: reportedUser.id, reportedUserName: reportedUser.name, reason, details, date: new Date().toISOString(), status: 'new' }),

    // --- CHAT & COMMS ---
    listenForConversations: (userId: string, callback: (convos: Conversation[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(conversationsCollection, where('members', 'array-contains', userId)), (s) => {
            const convos = s.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
            callback(convos.sort((a, b) => getMillis(b.lastMessageTimestamp) - getMillis(a.lastMessageTimestamp)));
        }, onError),
    startChat: async (currentUser: User, targetUser: PublicUserProfile): Promise<Conversation> => {
        const convoId = [currentUser.id, targetUser.id].sort().join('_');
        const snap = await getDoc(doc(conversationsCollection, convoId));
        if (snap.exists()) return { id: snap.id, ...snap.data() } as Conversation;
        const data = { members: [currentUser.id, targetUser.id], memberNames: { [currentUser.id]: currentUser.name, [targetUser.id]: targetUser.name }, lastMessage: "Handshake initialized", lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: currentUser.id, readBy: [currentUser.id], isGroup: false };
        await setDoc(doc(conversationsCollection, convoId), data);
        return { id: convoId, ...data } as Conversation;
    },
    createGroupChat: async (name: string, members: string[], names: Record<string, string>) => addDoc(conversationsCollection, { name, members, memberNames: names, lastMessage: "Group established", lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: members[0], readBy: [members[0]], isGroup: true }),
    listenForMessages: (convoId: string, currentUser: User, callback: (messages: Message[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(collection(db, 'conversations', convoId, 'messages'), orderBy('timestamp', 'asc')), (s) => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Message))), onError),
    sendMessage: async (convoId: string, message: Omit<Message, 'id' | 'timestamp'>, convo: Conversation) => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'conversations', convoId, 'messages')), { ...message, timestamp: serverTimestamp() });
        batch.update(doc(conversationsCollection, convoId), { lastMessage: message.text, lastMessageTimestamp: serverTimestamp(), lastMessageSenderId: message.senderId, readBy: [message.senderId] });
        await batch.commit();
    },
    markConversationAsRead: (convoId: string, userId: string) => updateDoc(doc(conversationsCollection, convoId), { readBy: arrayUnion(userId) }),
    getGroupMembers: async (memberIds: string[]): Promise<MemberUser[]> => api.getUsersByUids(memberIds) as any,
    updateGroupMembers: (id: string, members: string[], names: any) => updateDoc(doc(conversationsCollection, id), { members, memberNames: names }),
    leaveGroup: (id: string, userId: string) => updateDoc(doc(conversationsCollection, id), { members: arrayRemove(userId) }),

    // --- POSTS & CONTENT ---
    createPost: async (user: User, content: string, type: Post['types'], ccapAward: number, skills: string[] = []) => {
        const docRef = await addDoc(postsCollection, { authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role, content, date: new Date().toISOString(), upvotes: [], types: type, requiredSkills: skills, commentCount: 0, repostCount: 0 });
        if (ccapAward > 0) await updateDoc(doc(usersCollection, user.id), { ccap: increment(ccapAward) });
    },
    repostPost: async (original: Post, user: User, comment: string) => {
        const batch = writeBatch(db);
        const repostRef = doc(postsCollection);
        batch.set(repostRef, { authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role, content: comment, date: new Date().toISOString(), upvotes: [], types: 'general', repostedFrom: { authorId: original.authorId, authorName: original.authorName, authorCircle: original.authorCircle, content: original.content, date: original.date } });
        batch.update(doc(postsCollection, original.id), { repostCount: increment(1) });
        await batch.commit();
    },
    sendDistressPost: async (user: MemberUser, content: string) => {
        await addDoc(postsCollection, { authorId: user.id, authorName: "Anonymous Member", authorCircle: user.circle, authorRole: user.role, content, date: new Date().toISOString(), upvotes: [], types: 'distress' });
        await updateDoc(doc(usersCollection, user.id), { distress_calls_available: increment(-1) });
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
    fetchRegularPosts: async (count: number, filter: string, isAdmin: boolean, start?: any, currentUser?: User) => {
        const types = ['general', 'proposal', 'offer', 'opportunity'];
        let q;
        if (filter === 'all' || filter === 'foryou') {
            q = query(postsCollection, where('types', 'in', isAdmin ? [...types, 'distress'] : types), orderBy('date', 'desc'), limit(count));
        } else if (filter === 'following' && currentUser?.following?.length) {
            q = query(postsCollection, where('authorId', 'in', currentUser.following.slice(0, 10)), orderBy('date', 'desc'), limit(count));
        } else {
            q = query(postsCollection, where('types', '==', filter), orderBy('date', 'desc'), limit(count));
        }
        if (start) q = query(q, startAfter(start));
        const s = await getDocs(q);
        return { posts: s.docs.map(d => ({ id: d.id, ...d.data() } as Post)), lastVisible: s.docs[s.docs.length - 1] };
    },
    listenForPostsByAuthor: (authorId: string, cb: (p: Post[]) => void, err: any) => onSnapshot(query(postsCollection, where('authorId', '==', authorId), orderBy('date', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), err),
    togglePinPost: (admin: User, id: string, pin: boolean) => updateDoc(doc(postsCollection, id), { isPinned: pin }),

    // --- COMMENTS ---
    listenForComments: (pid: string, cb: (c: Comment[]) => void, coll: 'posts'|'proposals' = 'posts', err: any) => onSnapshot(query(collection(db, coll, pid, 'comments'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment))), err),
    addComment: (pid: string, data: any, coll: 'posts'|'proposals' = 'posts') => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, coll, pid, 'comments')), { ...data, timestamp: serverTimestamp() });
        batch.update(doc(db, coll, pid), { commentCount: increment(1) });
        return batch.commit();
    },
    deleteComment: (pid: string, cid: string, coll: 'posts'|'proposals' = 'posts') => deleteDoc(doc(db, coll, pid, 'comments', cid)),
    upvoteComment: async (pid: string, cid: string, uid: string, coll: 'posts'|'proposals' = 'posts') => {
        const ref = doc(db, coll, pid, 'comments', cid);
        const s = await getDoc(ref);
        if (s.exists()) await updateDoc(ref, { upvotes: (s.data().upvotes || []).includes(uid) ? arrayRemove(uid) : arrayUnion(uid) });
    },

    // --- ECONOMY & CVP ---
    getCommunityValuePool: async (): Promise<CommunityValuePool> => {
        const s = await getDoc(doc(globalsCollection, 'cvp'));
        return s.exists() ? s.data() as CommunityValuePool : { id: 'singleton', total_usd_value: 0, total_circulating_ccap: 0, ccap_to_usd_rate: 0.01 };
    },
    listenForCVP: (admin: User, cb: (cvp: CommunityValuePool | null) => void, err: any) => onSnapshot(doc(globalsCollection, 'cvp'), s => cb(s.exists() ? s.data() as CommunityValuePool : null), err),
    addFundsToCVP: (admin: User, amount: number) => updateDoc(doc(globalsCollection, 'cvp'), { total_usd_value: increment(amount) }),
    setGlobalEconomy: (admin: User, data: Partial<GlobalEconomy>) => setDoc(doc(globalsCollection, 'economy'), data, { merge: true }),
    updateUbtRedemptionWindow: (admin: User, open: boolean) => {
        const data = open ? { ubtRedemptionWindowOpen: true, ubtRedemptionWindowStartedAt: serverTimestamp(), ubtRedemptionWindowClosesAt: Timestamp.fromDate(new Date(Date.now() + 432000000)) } : { ubtRedemptionWindowOpen: false, ubtRedemptionWindowClosesAt: null };
        return setDoc(doc(globalsCollection, 'economy'), data, { merge: true });
    },
    updateUserUbt: (admin: Admin, uid: string, amt: number, reason: string) => runTransaction(db, async t => {
        t.update(doc(usersCollection, uid), { ubtBalance: increment(amt) });
        t.set(doc(collection(db, 'users', uid, 'transactions')), { type: amt > 0 ? 'credit' : 'debit', amount: Math.abs(amt), reason, timestamp: serverTimestamp(), actorId: admin.id, actorName: admin.name });
    }),
    requestUbtRedemption: (user: User, amt: number, val: number, name: string, phone: string) => runTransaction(db, async t => {
        t.set(doc(payoutsCollection), { userId: user.id, userName: user.name, type: 'ubt_redemption', amount: val, status: 'pending', requestedAt: serverTimestamp(), ecocashName: name, ecocashNumber: phone, meta: { ubtAmount: amt } });
        t.update(doc(usersCollection, user.id), { ubtBalance: increment(-amt) });
    }),
    requestOnchainWithdrawal: (user: User, amt: number, addr: string) => runTransaction(db, async t => {
        t.set(doc(payoutsCollection), { userId: user.id, userName: user.name, type: 'onchain_withdrawal', amount: amt, status: 'pending', requestedAt: serverTimestamp(), meta: { solanaAddress: addr } });
        t.update(doc(usersCollection, user.id), { ubtBalance: increment(-amt) });
    }),

    // --- VENTURES ---
    createVenture: (data: any) => addDoc(venturesCollection, { ...data, status: 'fundraising', createdAt: serverTimestamp(), fundingRaisedCcap: 0, backers: [], totalSharesIssued: 10000, totalProfitsDistributed: 0, ticker: data.name.substring(0,4).toUpperCase() }),
    deleteVenture: (user: User, id: string) => deleteDoc(doc(venturesCollection, id)),
    getVentureById: async (id: string) => { const s = await getDoc(doc(venturesCollection, id)); return s.exists() ? { id: s.id, ...s.data() } as Venture : null; },
    listenForFundraisingVentures: (cb: (v: Venture[]) => void, err: any) => onSnapshot(query(venturesCollection, where('status', '==', 'fundraising')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForUserVentures: (uid: string, cb: (v: Venture[]) => void, err: any) => onSnapshot(query(venturesCollection, where('ownerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForVentures: (admin: User, cb: (v: Venture[]) => void, err: any) => onSnapshot(venturesCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    getVentureMembers: async (count: number) => {
        const q = query(usersCollection, where('isLookingForPartners', '==', true), limit(count));
        const s = await getDocs(q);
        return { users: s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile)) };
    },
    getDistributionsForUserInVenture: async (uid: string, vid: string, userShares: number, totalShares: number) => {
        const s = await getDocs(query(collection(db, 'ventures', vid, 'distributions'), orderBy('date', 'desc')));
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Distribution));
    },

    getFundraisingVentures: async (): Promise<Venture[]> => {
        const q = query(venturesCollection, where('status', '==', 'fundraising'));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Venture));
    },

    // --- P2P & EXCHANGE ---
    listenToP2POffers: (cb: (o: P2POffer[]) => void, err: any) => onSnapshot(query(p2pCollection, where('status', '==', 'OPEN')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as P2POffer))), err),
    createSellRequest: (user: User, amt: number, val: number) => addDoc(sellRequestsCollection, { userId: user.id, userName: user.name, userPhone: user.phone || 'N/A', amountUbt: amt, amountUsd: val, status: 'PENDING', createdAt: serverTimestamp() }),
    createPendingUbtPurchase: (user: User, val: number, amt: number, ref: string) => addDoc(pendingPurchasesCollection, { userId: user.id, userName: user.name, amountUsd: val, amountUbt: amt, ecocashRef: ref, status: 'PENDING', createdAt: serverTimestamp() }),
    cancelSellRequest: (user: User, id: string) => updateDoc(doc(sellRequestsCollection, id), { status: 'CANCELLED' }),
    completeSellRequest: (user: User, req: SellRequest) => updateDoc(doc(sellRequestsCollection, req.id), { status: 'COMPLETED', completedAt: serverTimestamp() }),
    claimSellRequest: (claimer: User, id: string) => updateDoc(doc(sellRequestsCollection, id), { status: 'CLAIMED', claimerId: claimer.id, claimerName: claimer.name, claimerRole: claimer.role, claimedAt: serverTimestamp() }),
    dispatchSellPayment: (admin: User, id: string, ref: string) => updateDoc(doc(sellRequestsCollection, id), { status: 'DISPATCHED', ecocashRef: ref, dispatchedAt: serverTimestamp() }),
    listenToSellRequests: (cb: (s: SellRequest[]) => void, err: any) => onSnapshot(sellRequestsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest))), err),

    // --- TREASURY & VAULTS ---
    listenToVaults: (cb: (v: TreasuryVault[]) => void, err: any) => onSnapshot(vaultsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryVault))), err),
    listenToUserVaults: (uid: string, cb: (v: UserVault[]) => void) => onSnapshot(query(collection(db, 'users', uid, 'vaults'), orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as UserVault))), console.error),
    createUserVault: (uid: string, name: string, type: any, days: number) => addDoc(collection(db, 'users', uid, 'vaults'), { userId: uid, name, type, balance: 0, createdAt: serverTimestamp(), lockedUntil: Timestamp.fromDate(new Date(Date.now() + days * 86400000)) }),
    initializeTreasury: async (admin: Admin) => {
        const batch = writeBatch(db);
        const v = [{ id: 'GENESIS', name: "Genesis Root", type: "GENESIS", balance: 15000000, description: "Protocol hard cap root." }];
        v.forEach(x => batch.set(doc(vaultsCollection, x.id), { ...x, publicKey: cryptoService.generateNonce(), isLocked: true, createdAt: serverTimestamp() }));
        await batch.commit();
    },
    toggleVaultLock: (id: string, lock: boolean) => updateDoc(doc(vaultsCollection, id), { isLocked: lock }),
    syncInternalVaults: (admin: Admin, from: TreasuryVault, to: TreasuryVault, amt: number, reason: string) => runTransaction(db, async t => {
        t.update(doc(vaultsCollection, from.id), { balance: increment(-amt) });
        t.update(doc(vaultsCollection, to.id), { balance: increment(amt) });
        const txId = `sync-${Date.now()}`;
        t.set(doc(ledgerCollection, txId), { id: txId, senderId: from.id, receiverId: to.id, amount: amt, reason, timestamp: Date.now(), protocol_mode: 'MAINNET', senderPublicKey: from.publicKey, serverTimestamp: serverTimestamp() });
    }),

    // --- ADMIN LISTENERS & ACTIONS ---
    listenForPendingPurchases: (cb: (p: PendingUbtPurchase[]) => void, err: any) => onSnapshot(query(pendingPurchasesCollection, where('status', '==', 'PENDING')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PendingUbtPurchase))), err),
    approveUbtPurchase: (admin: Admin, p: PendingUbtPurchase) => runTransaction(db, async t => {
        t.update(doc(pendingPurchasesCollection, p.id), { status: 'VERIFIED', verifiedAt: serverTimestamp() });
        t.update(doc(usersCollection, p.userId), { ubtBalance: increment(p.amountUbt) });
    }),
    rejectUbtPurchase: (id: string) => updateDoc(doc(pendingPurchasesCollection, id), { status: 'REJECTED' }),
    mintTestUbt: async (admin: Admin, amount: number) => {
        await updateDoc(doc(usersCollection, admin.id), { ubtBalance: increment(amount) });
        const txId = `sim-${Date.now()}`;
        await setDoc(doc(ledgerCollection, txId), { id: txId, senderId: 'PROTOCOL_ROOT', receiverId: admin.id, amount, timestamp: Date.now(), protocol_mode: 'TESTNET', serverTimestamp: serverTimestamp() });
    },
    approveMemberAndCreditUbt: async (admin: Admin, member: Member) => {
        if (!member.uid) return;
        return runTransaction(db, async (t) => {
            t.update(doc(membersCollection, member.id), { payment_status: 'complete' });
            t.update(doc(usersCollection, member.uid!), { status: 'active', ubtBalance: increment(100), initialUbtStake: 100 });
        });
    },
    listenForReports: (admin: User, cb: (r: Report[]) => void, err: any) => onSnapshot(query(reportsCollection, orderBy('date', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))), err),
    listenForPayoutRequests: (admin: User, cb: (r: PayoutRequest[]) => void, err: any) => onSnapshot(query(payoutsCollection, orderBy('requestedAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),

    listenForAllUsers: (admin: User, cb: (users: User[]) => void, err: any) => onSnapshot(usersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), err),
    listenForAllMembers: (admin: User, cb: (members: Member[]) => void, err: any) => onSnapshot(membersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForAllAgents: (admin: User, cb: (agents: Agent[]) => void, err: any) => onSnapshot(query(usersCollection, where('role', '==', 'agent')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Agent))), err),
    listenForPendingMembers: (admin: User, cb: (members: Member[]) => void, err: any) => onSnapshot(query(membersCollection, where('payment_status', '==', 'pending_verification')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    
    updatePayoutStatus: (admin: User, payout: PayoutRequest, status: 'completed' | 'rejected') => 
        updateDoc(doc(payoutsCollection, payout.id), { status, processedBy: { adminId: admin.id, adminName: admin.name }, completedAt: serverTimestamp() }),

    // --- AGENTS ---
    getAgentMembers: async (agent: Agent): Promise<Member[]> => {
        const q = query(membersCollection, where('agent_id', '==', agent.id));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Member));
    },
    registerMember: async (agent: Agent, data: NewMember): Promise<Member> => {
        const welcome = await generateWelcomeMessage(data.full_name, data.circle);
        const memberRef = doc(collection(db, 'members'));
        const memberData = { ...data, agent_id: agent.id, agent_name: agent.name, date_registered: serverTimestamp(), welcome_message: welcome, membership_card_id: `UGC-M-${Math.random().toString(36).substr(7).toUpperCase()}` };
        await setDoc(memberRef, memberData);
        return { id: memberRef.id, ...memberData, date_registered: Timestamp.now() } as Member;
    },

    // --- MISC ---
    performDailyCheckin: (uid: string) => updateDoc(doc(usersCollection, uid), { scap: increment(10), lastDailyCheckin: serverTimestamp() }),
    submitPriceVerification: (uid: string, item: string, price: number, shop: string) => addDoc(collection(db, 'price_verifications'), { userId: uid, item, price, shop, date: serverTimestamp() }),
    awardKnowledgePoints: async (uid: string) => {
        const ref = doc(usersCollection, uid);
        const s = await getDoc(ref);
        if (s.exists() && !s.data().hasReadKnowledgeBase) {
            await updateDoc(ref, { hasReadKnowledgeBase: true, knowledgePoints: increment(10) });
            return true;
        }
        return false;
    },
    getCurrentRedemptionCycle: async () => { const q = query(redemptionCyclesCollection, orderBy('endDate', 'desc'), limit(1)); const s = await getDocs(q); return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() } as RedemptionCycle; },
    listenForUserPayouts: (uid: string, cb: (p: PayoutRequest[]) => void, err: any) => onSnapshot(query(payoutsCollection, where('userId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest)).sort((a,b) => getMillis(b.requestedAt) - getMillis(a.requestedAt))), err),
    requestPayout: (u: User, n: string, p: string, a: number) => addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'referral', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() }),
    requestCommissionPayout: (u: User, n: string, p: string, a: number) => runTransaction(db, async t => {
        t.set(doc(collection(db, 'payouts')), { userId: u.id, userName: u.name, type: 'commission', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() });
        t.update(doc(usersCollection, u.id), { commissionBalance: 0 });
    }),
    redeemCcapForCash: (u: User, n: string, p: string, v: number, c: number, r: number) => addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'ccap_redemption', amount: v, status: 'pending', requestedAt: serverTimestamp(), ecocashName: n, ecocashNumber: p, meta: { ccapAmount: c, ccapToUsdRate: r } }),
    stakeCcapForNextCycle: (u: MemberUser) => updateDoc(doc(db, 'users', u.id), { lastCycleChoice: 'staked' }),
    convertCcapToVeq: (u: MemberUser, v: Venture, c: number, r: number) => runTransaction(db, async t => {
        const shares = Math.floor(c * r * 100);
        t.update(doc(db, 'users', u.id), { lastCycleChoice: 'invested', ventureEquity: arrayUnion({ ventureId: v.id, ventureName: v.name, ventureTicker: v.ticker, shares }) });
        t.update(doc(venturesCollection, v.id), { fundingRaisedCcap: increment(c), backers: arrayUnion(u.id) });
    }),
    listenForProposals: (cb: (p: Proposal[]) => void, err: any) => onSnapshot(proposalsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), err),
    createProposal: (u: User, d: any) => addDoc(proposalsCollection, { ...d, authorId: u.id, authorName: u.name, createdAt: serverTimestamp(), status: 'active', votesFor: [], votesAgainst: [], voteCountFor: 0, voteCountAgainst: 0 }),
    voteOnProposal: (id: string, uid: string, vote: 'for'|'against') => updateDoc(doc(proposalsCollection, id), { [vote === 'for' ? 'votesFor' : 'votesAgainst']: arrayUnion(uid), [vote === 'for' ? 'voteCountFor' : 'voteCountAgainst']: increment(1) }),
    closeProposal: (u: User, id: string, status: string) => updateDoc(doc(proposalsCollection, id), { status }),
    getProposal: async (id: string) => { const s = await getDoc(doc(proposalsCollection, id)); return s.exists() ? { id: s.id, ...s.data() } as Proposal : null; },
    getSustenanceFund: async () => { const s = await getDoc(doc(sustenanceCollection, 'current')); return s.exists() ? s.data() as SustenanceCycle : null; },
    getAllSustenanceVouchers: async () => { const s = await getDocs(query(vouchersCollection, orderBy('issuedAt', 'desc'), limit(100))); return s.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher)); },
    initializeSustenanceFund: (u: User, b: number, c: number) => setDoc(doc(sustenanceCollection, 'current'), { slf_balance: b, hamper_cost: c, last_run: serverTimestamp(), next_run: serverTimestamp() }),
    runSustenanceLottery: (u: User) => Promise.resolve({ winners_count: 0 }),
    processPendingWelcomeMessages: async () => 0,

    getBroadcasts: async (): Promise<Broadcast[]> => {
        const q = query(broadcastsCollection, orderBy('date', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast));
    },

    sendBroadcast: (user: User, message: string) => 
        addDoc(broadcastsCollection, { authorId: user.id, authorName: user.name, message, date: new Date().toISOString() }),

    listenForReferredUsers: (uid: string, cb: (u: PublicUserProfile[]) => void, err: any) => 
        onSnapshot(query(usersCollection, where('referrerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile))), err),

    requestVeqPayout: (user: User, holding: VentureEquityHolding, shares: number, ecocashName: string, ecocashNumber: string) => 
        addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'veq_redemption', amount: shares, ecocashName, ecocashNumber, status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: holding.ventureId, ventureName: holding.ventureName } }),

    claimBonusPayout: (payoutId: string, name: string, phone: string) => 
        updateDoc(doc(payoutsCollection, payoutId), { ecocashName: name, ecocashNumber: phone }),
};
