
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
    Distribution, Transaction, GlobalEconomy, Admin, UbtTransaction, TreasuryVault, PendingUbtPurchase, SellRequest, P2POffer, AssetType, UserVault
} from '../types';

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
const vaultsCollection = collection(db, 'treasury_vaults');
const pendingPurchasesCollection = collection(db, 'pending_ubt_purchases');
const sellRequestsCollection = collection(db, 'sell_requests');
const p2pCollection = collection(db, 'p2p_offers');

const _deletePostAndSubcollections = async (postId: string) => {
    const postRef = doc(postsCollection, postId);
    const commentsSnapshot = await getDocs(collection(db, 'posts', postId, 'comments'));
    const batch = writeBatch(db);
    commentsSnapshot.forEach(doc => { batch.delete(doc.ref); });
    batch.delete(postRef);
    await batch.commit();
};

export const api = {
    // Auth & Presence
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

    // User Management
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
    getUsersByUids: async (uids: string[]): Promise<User[]> => {
        if (uids.length === 0) return [];
        const q = query(usersCollection, where('__name__', 'in', uids.slice(0, 30)));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
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
        const vaultDoc = await getDoc(doc(vaultsCollection, identifier));
        if (vaultDoc.exists()) return { id: vaultDoc.id, name: vaultDoc.data()?.name, ubtBalance: vaultDoc.data()?.balance, role: 'admin', circle: 'TREASURY' } as any;
        return null;
    },

    // Blockchain Ledger & Treasury
    initializeTreasury: async (admin: Admin) => {
        return runTransaction(db, async (t) => {
            const genesisRef = doc(vaultsCollection, 'GENESIS');
            const floatRef = doc(vaultsCollection, 'FLOAT');
            const genesisDoc = await t.get(genesisRef);
            if (genesisDoc.exists()) throw new Error("Genesis Block already indexed.");

            t.set(genesisRef, { id: 'GENESIS', name: "Genesis Node", balance: 14000000, type: 'GENESIS', isLocked: true, createdAt: serverTimestamp(), publicKey: 'ROOT_AUTHORITY_CHAIN' });
            t.set(floatRef, { id: 'FLOAT', name: "Liquidity Float", balance: 1000000, type: 'FLOAT', isLocked: false, createdAt: serverTimestamp(), publicKey: 'LIQUIDITY_FLOAT_CHAIN' });

            t.set(doc(ledgerCollection, 'BLOCK_ZERO'), {
                id: 'BLOCK_ZERO', senderId: 'SYSTEM', receiverId: 'GENESIS', amount: 15000000, timestamp: Date.now(), type: 'SYSTEM_MINT', protocol_mode: 'MAINNET', serverTimestamp: serverTimestamp()
            });
        });
    },

    processUbtTransaction: async (transaction: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const senderRef = doc(usersCollection, transaction.senderId);
            const receiverRef = doc(usersCollection, transaction.receiverId);
            const senderDoc = await t.get(senderRef);
            if (!senderDoc.exists()) throw new Error("Origin node offline.");
            if ((senderDoc.data().ubtBalance || 0) < transaction.amount) throw new Error("Insufficient liquidity.");

            t.update(senderRef, { ubtBalance: increment(-transaction.amount) });
            t.update(receiverRef, { ubtBalance: increment(transaction.amount) });
            t.set(doc(ledgerCollection, transaction.id), { ...transaction, serverTimestamp: serverTimestamp() });
        });
    },

    // Settle Bridge with Choice of Source Node
    approveUbtPurchase: (admin: Admin, p: PendingUbtPurchase, sourceVaultId: 'FLOAT' | 'GENESIS' = 'FLOAT') => runTransaction(db, async t => {
        const purchaseRef = doc(db, 'pending_ubt_purchases', p.id);
        const userRef = doc(db, 'users', p.userId);
        const sourceRef = doc(db, 'treasury_vaults', sourceVaultId);

        const sourceDoc = await t.get(sourceRef);
        if (!sourceDoc.exists()) throw new Error(`${sourceVaultId} node offline.`);
        if ((sourceDoc.data()?.balance || 0) < p.amountUbt) throw new Error("Insufficient reserve in selected node.");

        t.update(purchaseRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
        t.update(userRef, { ubtBalance: increment(p.amountUbt) });
        t.update(sourceRef, { balance: increment(-p.amountUbt) });

        const txId = `bridge-${Date.now().toString(36)}`;
        t.set(doc(db, 'ledger', txId), {
            id: txId, 
            senderId: sourceVaultId, 
            receiverId: p.userId, 
            amount: p.amountUbt, 
            timestamp: Date.now(), 
            type: p.payment_method === 'CRYPTO' ? 'CRYPTO_BRIDGE' : 'FIAT_BRIDGE', 
            protocol_mode: 'MAINNET', 
            serverTimestamp: serverTimestamp()
        });
        
        // Log transaction in user's history
        const userTxRef = doc(collection(db, 'users', p.userId, 'transactions'));
        t.set(userTxRef, {
            id: txId,
            type: 'p2p_received',
            amount: p.amountUbt,
            reason: `Bridge Settlement: ${sourceVaultId}`,
            timestamp: serverTimestamp(),
            txHash: txId
        });
    }),

    rejectUbtPurchase: (id: string) => updateDoc(doc(db, 'pending_ubt_purchases', id), { status: 'REJECTED' }),

    processAdminHandshake: async (vaultId: string, receiverId: string | null, amount: number, transaction: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const vaultRef = doc(vaultsCollection, vaultId);
            const vaultDoc = await t.get(vaultRef);
            if (!vaultDoc.exists()) throw new Error("Vault offline.");
            if (vaultDoc.data().balance < amount) throw new Error("Insufficient reserve.");

            t.update(vaultRef, { balance: increment(-amount) });
            if (receiverId && receiverId !== 'EXTERNAL_NODE') {
                t.update(doc(usersCollection, receiverId), { ubtBalance: increment(amount) });
            }
            t.set(doc(ledgerCollection, transaction.id), { ...transaction, serverTimestamp: serverTimestamp() });
        });
    },

    getPublicLedger: async (limitCount: number = 200): Promise<UbtTransaction[]> => {
        const q = query(ledgerCollection, orderBy('serverTimestamp', 'desc'), limit(limitCount));
        const s = await getDocs(q);
        return s.docs.map(doc => ({ id: doc.id, ...doc.data() } as UbtTransaction));
    },

    listenToVaults: (callback: (v: TreasuryVault[]) => void, onError: (error: Error) => void) => 
        onSnapshot(vaultsCollection, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryVault))), onError),

    toggleVaultLock: (id: string, lock: boolean) => updateDoc(doc(vaultsCollection, id), { isLocked: lock }),

    syncInternalVaults: (admin: Admin, from: TreasuryVault, to: TreasuryVault, amt: number, reason: string) => runTransaction(db, async t => {
        t.update(doc(vaultsCollection, from.id), { balance: increment(-amt) });
        t.update(doc(vaultsCollection, to.id), { balance: increment(amt) });
    }),

    listenForUserTransactions: (userId: string, callback: (txs: Transaction[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(collection(db, 'users', userId, 'transactions'), orderBy('timestamp', 'desc'), limit(50)), (s) => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), onError),

    // Economy Global State
    listenForGlobalEconomy: (callback: (economy: GlobalEconomy | null) => void, onError: (error: Error) => void) => 
        onSnapshot(doc(globalsCollection, 'economy'), (s) => callback(s.exists() ? s.data() as GlobalEconomy : null), onError),
    
    setGlobalEconomy: (admin: User, data: Partial<GlobalEconomy>) => setDoc(doc(globalsCollection, 'economy'), data, { merge: true }),
    
    updateUbtRedemptionWindow: (admin: User, open: boolean) => {
        const docRef = doc(globalsCollection, 'economy');
        if (open) {
            const now = Timestamp.now();
            const closesAt = new Date(now.toDate());
            closesAt.setDate(closesAt.getDate() + 5);
            return setDoc(docRef, { ubtRedemptionWindowOpen: true, ubtRedemptionWindowStartedAt: now, ubtRedemptionWindowClosesAt: Timestamp.fromDate(closesAt) }, { merge: true });
        } else {
            return setDoc(docRef, { ubtRedemptionWindowOpen: false, ubtRedemptionWindowClosesAt: null }, { merge: true });
        }
    },

    // Social
    followUser: async (follower: User, targetUserId: string) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, follower.id), { following: arrayUnion(targetUserId) });
        batch.update(doc(usersCollection, targetUserId), { followers: arrayUnion(follower.id) });
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
    reportUser: (reporter: User, reported: User, reason: string, details: string) => addDoc(reportsCollection, { reporterId: reporter.id, reporterName: reporter.name, reportedUserId: reported.id, reportedUserName: reported.name, reason, details, date: new Date().toISOString(), status: 'new' }),

    // Chat
    listenForConversations: (userId: string, callback: (convos: Conversation[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(conversationsCollection, where('members', 'array-contains', userId)), (s) => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Conversation))), onError),
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
    getGroupMembers: async (memberIds: string[]): Promise<MemberUser[]> => {
        if (memberIds.length === 0) return [];
        const q = query(usersCollection, where('__name__', 'in', memberIds));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d => ({ id: d.id, ...d.data()}) as MemberUser));
    },
    updateGroupMembers: (convoId: string, newMemberIds: string[], newMemberNames: {[key: string]: string}) => updateDoc(doc(conversationsCollection, convoId), { members: newMemberIds, memberNames: newMemberNames }),
    leaveGroup: (convoId: string, userId: string) => updateDoc(doc(conversationsCollection, convoId), { members: arrayRemove(userId) }),

    // Content
    createPost: async (user: User, content: string, type: Post['types'], ccapAward: number, skills: string[] = []) => {
        await addDoc(postsCollection, { authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role, content, date: new Date().toISOString(), upvotes: [], types: type, requiredSkills: skills, commentCount: 0, repostCount: 0, ccapAwarded: ccapAward });
    },
    repostPost: async (original: Post, user: User, comment: string) => {
        const batch = writeBatch(db);
        batch.set(doc(postsCollection), { authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role, content: comment, date: new Date().toISOString(), upvotes: [], types: 'general', repostedFrom: { authorId: original.authorId, authorName: original.authorName, authorCircle: original.authorCircle, content: original.content, date: original.date } });
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
    fetchRegularPosts: async (count: number, filter: string, isAdmin: boolean, start?: any, currentUser?: User) => {
        let q;
        if (filter === 'all') q = query(postsCollection, orderBy('date', 'desc'), limit(count));
        else if (filter === 'following' && currentUser) {
            if (!currentUser.following || currentUser.following.length === 0) return { posts: [], lastVisible: null };
            q = query(postsCollection, where('authorId', 'in', currentUser.following), orderBy('date', 'desc'), limit(count));
        }
        else q = query(postsCollection, where('types', '==', filter), orderBy('date', 'desc'), limit(count));
        if (start) q = query(q, startAfter(start));
        const s = await getDocs(q);
        return { posts: s.docs.map(d => ({ id: d.id, ...d.data() } as Post)), lastVisible: s.docs[s.docs.length - 1] };
    },
    listenForPostsByAuthor: (authorId: string, cb: (p: Post[]) => void, err: any) => onSnapshot(query(postsCollection, where('authorId', '==', authorId), orderBy('date', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), err),
    togglePinPost: (admin: User, id: string, pin: boolean) => updateDoc(doc(postsCollection, id), { isPinned: pin }),
    sendDistressPost: async (user: MemberUser, content: string) => {
        await addDoc(postsCollection, { authorId: user.id, authorName: 'Anonymous Member', authorCircle: user.circle, authorRole: user.role, content, date: new Date().toISOString(), upvotes: [], types: 'distress' });
    },
    deleteDistressPost: (admin: User, pid: string, uid: string) => deleteDoc(doc(postsCollection, pid)),
    reportPost: (user: User, post: Post, reason: string, details: string) => addDoc(reportsCollection, { reporterId: user.id, reporterName: user.name, reportedUserId: post.authorId, reportedUserName: post.authorName, postId: post.id, postContent: post.content, postAuthorId: post.authorId, reason, details, date: new Date().toISOString(), status: 'new' }),

    // Comments
    // FIX: Renamed 'callback' to 'cb' to match function parameter.
    listenForComments: (pid: string, cb: (c: Comment[]) => void, coll: 'posts'|'proposals' = 'posts', err: any) => onSnapshot(query(collection(db, coll, pid, 'comments'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment))), err),
    addComment: (pid: string, data: any, coll: 'posts'|'proposals' = 'posts') => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, coll, pid, 'comments')), { ...data, timestamp: serverTimestamp() });
        batch.update(doc(db, coll, pid), { commentCount: increment(1) });
        return batch.commit();
    },
    deleteComment: (parentId: string, commentId: string, parentCollection: 'posts' | 'proposals') => deleteDoc(doc(db, parentCollection, parentId, 'comments', commentId)),
    upvoteComment: async (parentId: string, commentId: string, userId: string, parentCollection: 'posts' | 'proposals') => {
        const ref = doc(db, parentCollection, parentId, 'comments', commentId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const upvotes = snap.data().upvotes || [];
            await updateDoc(ref, { upvotes: upvotes.includes(userId) ? arrayRemove(userId) : arrayUnion(userId) });
        }
    },

    // Admin Actions
    listenForAllUsers: (admin: User, cb: (u: User[]) => void, err: any) => onSnapshot(usersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), err),
    listenForAllMembers: (admin: User, cb: (m: Member[]) => void, err: any) => onSnapshot(membersCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForAllAgents: (admin: User, cb: (a: Agent[]) => void, err: any) => onSnapshot(query(usersCollection, where('role', '==', 'agent')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Agent))), err),
    listenForPendingMembers: (admin: User, cb: (m: Member[]) => void, err: any) => onSnapshot(query(membersCollection, where('payment_status', '==', 'pending_verification')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err),
    listenForReports: (admin: User, cb: (r: Report[]) => void, err: any) => onSnapshot(reportsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))), err),
    listenForPayoutRequests: (admin: User, cb: (r: PayoutRequest[]) => void, err: any) => onSnapshot(payoutsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),
    listenForPendingPurchases: (cb: (p: PendingUbtPurchase[]) => void, err: any) => onSnapshot(query(pendingPurchasesCollection, where('status', '==', 'PENDING')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PendingUbtPurchase))), err),
    updatePayoutStatus: (admin: User, payout: PayoutRequest, status: string) => updateDoc(doc(payoutsCollection, payout.id), { status, processedBy: { adminId: admin.id, adminName: admin.name }, completedAt: serverTimestamp() }),

    // Economy & Ventures
    getCommunityValuePool: async (): Promise<CommunityValuePool> => {
        const s = await getDoc(doc(globalsCollection, 'cvp'));
        return s.exists() ? s.data() as CommunityValuePool : { id: 'singleton', total_usd_value: 0, total_circulating_ccap: 0, ccap_to_usd_rate: 0.01 };
    },
    listenForCVP: (admin: User, cb: (cvp: CommunityValuePool | null) => void, err: any) => onSnapshot(doc(globalsCollection, 'cvp'), s => cb(s.exists() ? s.data() as CommunityValuePool : null), err),
    addFundsToCVP: (admin: User, amount: number) => updateDoc(doc(globalsCollection, 'cvp'), { total_usd_value: increment(amount) }),
    updateUserUbt: (admin: Admin, uid: string, amt: number, reason: string) => runTransaction(db, async t => {
        t.update(doc(usersCollection, uid), { ubtBalance: increment(amt) });
    }),
    requestUbtRedemption: (user: User, amt: number, val: number, name: string, phone: string) => addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'ubt_redemption', amount: val, status: 'pending', requestedAt: serverTimestamp(), ecocashName: name, ecocashNumber: phone, meta: { ubtAmount: amt } }),
    requestOnchainWithdrawal: (user: User, amt: number, addr: string) => addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'onchain_withdrawal', amount: amt, status: 'pending', requestedAt: serverTimestamp(), ecocashName: 'N/A', ecocashNumber: 'N/A', meta: { solanaAddress: addr } }),
    redeemCcapForCash: (user: User, ecocashName: string, ecocashNumber: string, usdtValue: number, ccapToRedeem: number, ccap_to_usd_rate: number) => {
        return addDoc(collection(db, 'payouts'), {
            userId: user.id, userName: user.name, type: 'ccap_redemption', amount: usdtValue, status: 'pending', requestedAt: serverTimestamp(), ecocashName, ecocashNumber,
            meta: { ccapAmount: ccapToRedeem, ccapToUsdRate: ccap_to_usd_rate }
        });
    },
    stakeCcapForNextCycle: (user: MemberUser) => updateDoc(doc(db, 'users', user.id), { lastCycleChoice: 'staked' }),
    convertCcapToVeq: (user: MemberUser, venture: Venture, ccapAmount: number, ccapRate: number) => runTransaction(db, async t => {
        t.update(doc(db, 'users', user.id), { lastCycleChoice: 'invested' });
        t.update(doc(db, 'ventures', venture.id), { fundingRaisedCcap: increment(ccapAmount) });
    }),
    listenForVentures: (admin: User, cb: (v: Venture[]) => void, err: any) => onSnapshot(venturesCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    createVenture: (data: any) => addDoc(venturesCollection, { ...data, status: 'fundraising', createdAt: serverTimestamp(), fundingRaisedCcap: 0, backers: [], totalSharesIssued: 10000, totalProfitsDistributed: 0 }),
    getVentureById: async (id: string) => { const s = await getDoc(doc(venturesCollection, id)); return s.exists() ? { id: s.id, ...s.data() } as Venture : null; },
    listenForFundraisingVentures: (cb: (v: Venture[]) => void, err: any) => onSnapshot(query(venturesCollection, where('status', '==', 'fundraising')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    listenForUserVentures: (userId: string, cb: (v: Venture[]) => void, err: any) => onSnapshot(query(venturesCollection, where('ownerId', '==', userId)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err),
    getVentureMembers: async (count: number) => {
        const q = query(usersCollection, where('isLookingForPartners', '==', true), limit(count));
        const s = await getDocs(q);
        return { users: s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile)) };
    },
    getFundraisingVentures: async (): Promise<Venture[]> => {
        const q = query(venturesCollection, where('status', '==', 'fundraising'));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Venture));
    },
    deleteVenture: (admin: User, vid: string) => deleteDoc(doc(venturesCollection, vid)),
    getDistributionsForUserInVenture: async (uid: string, vid: string, userShares: number, totalShares: number) => {
        const s = await getDocs(query(collection(db, 'ventures', vid, 'distributions'), orderBy('date', 'desc')));
        return s.docs.map(d => ({ id: d.id, ...d.data() } as Distribution));
    },
    requestVeqPayout: (user: User, holding: VentureEquityHolding, shares: number, ecocashName: string, ecocashNumber: string) => addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'veq_redemption', amount: shares, ecocashName, ecocashNumber, status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: holding.ventureId, ventureName: holding.ventureName } }),

    // Proposals
    listenForProposals: (cb: (p: Proposal[]) => void, err: any) => onSnapshot(proposalsCollection, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), err),
    getProposal: async (id: string): Promise<Proposal | null> => { const s = await getDoc(doc(proposalsCollection, id)); return s.exists() ? { id: s.id, ...s.data() } as Proposal : null; },
    createProposal: (user: User, data: any) => addDoc(proposalsCollection, { ...data, authorId: user.id, authorName: user.name, createdAt: serverTimestamp(), status: 'active', votesFor: [], votesAgainst: [], voteCountFor: 0, voteCountAgainst: 0 }),
    voteOnProposal: (pid: string, uid: string, vote: string) => runTransaction(db, async t => {
        const ref = doc(proposalsCollection, pid);
        const s = await t.get(ref);
        if (!s.exists()) throw new Error("Proposal not found.");
        const data = s.data() as Proposal;
        if (data.votesFor.includes(uid) || data.votesAgainst.includes(uid)) throw new Error("Already voted.");
        if (vote === 'for') t.update(ref, { votesFor: arrayUnion(uid), voteCountFor: increment(1) });
        else t.update(ref, { votesAgainst: arrayUnion(uid), voteCountAgainst: increment(1) });
    }),
    closeProposal: (user: User, pid: string, status: string) => updateDoc(doc(proposalsCollection, pid), { status }),

    // Sustenance
    getSustenanceFund: async () => { const s = await getDoc(doc(sustenanceCollection, 'current')); return s.exists() ? s.data() as SustenanceCycle : null; },
    getAllSustenanceVouchers: async () => { const s = await getDocs(query(vouchersCollection, orderBy('issuedAt', 'desc'), limit(100))); return s.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher)); },
    initializeSustenanceFund: (admin: User, balance: number, cost: number) => setDoc(doc(sustenanceCollection, 'current'), { slf_balance: balance, hamper_cost: cost, last_run: serverTimestamp(), next_run: serverTimestamp() }),
    runSustenanceLottery: (admin: User): Promise<{ winners_count: number }> => Promise.resolve({ winners_count: 0 }),
    redeemVoucher: (vendor: User, vid: string) => updateDoc(doc(vouchersCollection, vid), { status: 'redeemed', redeemedAt: serverTimestamp(), redeemedBy: vendor.id }),

    // Vaults
    listenToUserVaults: (uid: string, cb: (v: UserVault[]) => void) => onSnapshot(query(collection(db, 'users', uid, 'vaults'), orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as UserVault))), console.error),
    createUserVault: (uid: string, name: string, type: any, days: number) => addDoc(collection(db, 'users', uid, 'vaults'), { userId: uid, name, type, balance: 0, createdAt: serverTimestamp(), lockedUntil: Timestamp.fromDate(new Date(Date.now() + days * 86400000)) }),

    // Misc & Lifecycle
    performDailyCheckin: (uid: string) => updateDoc(doc(usersCollection, uid), { scap: increment(10), lastDailyCheckin: serverTimestamp() }),
    submitPriceVerification: (uid: string, item: string, price: number, shop: string) => addDoc(collection(db, 'price_verifications'), { userId: uid, item, price, shop, date: serverTimestamp() }),
    awardKnowledgePoints: (uid: string) => updateDoc(doc(usersCollection, uid), { hasReadKnowledgeBase: true, knowledgePoints: increment(10) }),
    listenForReferredUsers: (uid: string, cb: (u: PublicUserProfile[]) => void, err: any) => onSnapshot(query(usersCollection, where('referrerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile))), err),
    listenForUserPayouts: (uid: string, cb: (p: PayoutRequest[]) => void, err: any) => onSnapshot(query(payoutsCollection, where('userId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err),
    requestPayout: (u: User, n: string, p: string, a: number) => addDoc(payoutsCollection, { userId: u.id, userName: u.name, type: 'referral', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() }),
    claimBonusPayout: (id: string, n: string, p: string) => updateDoc(doc(payoutsCollection, id), { ecocashName: n, ecocashNumber: p }),
    requestCommissionPayout: (user: User, name: string, phone: string, amount: number) => addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'commission', amount, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp() }),
    getBroadcasts: async (): Promise<Broadcast[]> => { const q = query(broadcastsCollection, orderBy('date', 'desc'), limit(10)); const s = await getDocs(q); return s.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast)); },
    sendBroadcast: (user: User, message: string) => addDoc(broadcastsCollection, { authorId: user.id, authorName: user.name, message, date: new Date().toISOString() }),
    getCurrentRedemptionCycle: async () => { const q = query(redemptionCyclesCollection, orderBy('endDate', 'desc'), limit(1)); const s = await getDocs(q); return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() } as RedemptionCycle; },
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
    listenToP2POffers: (cb: (o: P2POffer[]) => void, err: any) => onSnapshot(query(p2pCollection, where('status', '==', 'OPEN')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as P2POffer))), err),
    createSellRequest: (user: User, amt: number, val: number) => addDoc(sellRequestsCollection, { userId: user.id, userName: user.name, userPhone: user.phone || 'N/A', amountUbt: amt, amountUsd: val, status: 'PENDING', createdAt: serverTimestamp() }),
    
    // createPendingUbtPurchase explicitly handles optional parameters by setting them to null instead of undefined.
    createPendingUbtPurchase: (user: User, val: number, amt: number, ref?: string, asset?: AssetType, address?: string) => addDoc(pendingPurchasesCollection, { 
        userId: user.id, 
        userName: user.name, 
        amountUsd: val, 
        amountUbt: amt, 
        status: 'PENDING', 
        createdAt: serverTimestamp(), 
        ecocashRef: ref || null, 
        cryptoAsset: asset || null, 
        cryptoAddress: address || null, 
        payment_method: asset ? 'CRYPTO' : 'FIAT' 
    }),
    
    cancelSellRequest: (user: User, id: string) => updateDoc(doc(sellRequestsCollection, id), { status: 'CANCELLED' }),
    completeSellRequest: (user: User, req: SellRequest) => updateDoc(doc(sellRequestsCollection, req.id), { status: 'COMPLETED', completedAt: serverTimestamp() }),
    claimSellRequest: (claimer: User, id: string) => updateDoc(doc(sellRequestsCollection, id), { status: 'CLAIMED', claimerId: claimer.id, claimerName: claimer.name, claimerRole: claimer.role, claimedAt: serverTimestamp() }),
    dispatchSellPayment: (admin: User, id: string, ref: string) => updateDoc(doc(sellRequestsCollection, id), { status: 'DISPATCHED', ecocashRef: ref, dispatchedAt: serverTimestamp() }),
    listenToSellRequests: (callback: (r: SellRequest[]) => void, onError: (error: Error) => void) => 
        onSnapshot(sellRequestsCollection, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest))), onError),
};
