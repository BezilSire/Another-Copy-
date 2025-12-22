
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
    Distribution, Transaction, GlobalEconomy, Admin, UbtTransaction, P2POffer, PendingUbtPurchase, SellRequest, TreasuryVault
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

const _deletePostAndSubcollections = async (postId: string) => {
    const postRef = doc(postsCollection, postId);
    const commentsSnapshot = await getDocs(collection(db, 'posts', postId, 'comments'));
    const batch = writeBatch(db);
    commentsSnapshot.forEach(doc => { batch.delete(doc.ref); });
    batch.delete(postRef);
    await batch.commit();
};

export const api = {
    // Auth
    login: (email: string, password: string): Promise<FirebaseUser> => {
        return signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => userCredential.user);
    },
    logout: () => signOut(auth),
    sendPasswordReset: (email: string) => sendPasswordResetEmail(auth, email),
    sendVerificationEmail: async () => {
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
    listenForUsersPresence: (userIds: string[], callback: (statuses: Record<string, boolean>) => void) => {
        return onValue(ref(rtdb, '/status'), (snapshot) => {
            const statuses: Record<string, boolean> = {};
            const allUsersStatus = snapshot.val() || {};
            userIds.forEach(id => { statuses[id] = allUsersStatus[id]?.state === 'online'; });
            callback(statuses);
        });
    },

    // User
    getUser: async (uid: string): Promise<User> => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) throw new Error("User data not found.");
        return { id: userDoc.id, ...userDoc.data() } as User;
    },
    getUserByPublicKey: async (publicKey: string): Promise<User | null> => {
        const q = query(usersCollection, where('publicKey', '==', publicKey), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as User;
    },
    getUserByReferralCode: async (referralCode: string): Promise<User | null> => {
        const q = query(usersCollection, where('referralCode', '==', referralCode), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as User;
    },
    updateUser: (uid: string, data: Partial<User>) => updateDoc(doc(db, 'users', uid), data),
    updateMemberAndUserProfile: async (userId: string, memberId: string, userUpdateData: Partial<User>, memberUpdateData: Partial<Member>) => {
        const batch = writeBatch(db);
        const userRef = doc(usersCollection, userId);
        batch.update(userRef, userUpdateData);
        const memberRef = doc(membersCollection, memberId);
        batch.update(memberRef, memberUpdateData);
        try {
            await batch.commit();
        } catch (error: any) {
            console.error("Atomic profile update failed:", error);
            throw new Error("Failed to save profile. Ensure you have permission to update all fields.");
        }
    },
    getPublicUserProfile: async (uid: string): Promise<PublicUserProfile | null> => {
        const userDoc = await getDoc(doc(usersCollection, uid));
        if (!userDoc.exists()) return null;
        const d = userDoc.data();
        return {
            id: userDoc.id, name: d.name, email: d.email, role: d.role, circle: d.circle, status: d.status, bio: d.bio, profession: d.profession,
            skills: d.skills, interests: d.interests, businessIdea: d.businessIdea, isLookingForPartners: d.isLookingForPartners,
            lookingFor: d.lookingFor, credibility_score: d.credibility_score, ccap: d.ccap, createdAt: d.createdAt,
            pitchDeckTitle: d.pitchDeckTitle, pitchDeckSlides: d.pitchDeckSlides, publicKey: d.publicKey,
            followers: d.followers || [], following: d.following || [], socialLinks: d.socialLinks || [],
            ubtBalance: d.ubtBalance
        };
    },
     getPublicUserProfilesByUids: async (uids: string[]): Promise<PublicUserProfile[]> => {
        if (uids.length === 0) return [];
        const promises = [];
        for (let i = 0; i < uids.length; i += 30) {
            const chunk = uids.slice(i, i + 30);
            const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
            promises.push(getDocs(q));
        }
        const snapshots = await Promise.all(promises);
        const profiles: PublicUserProfile[] = [];
        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => { profiles.push({ id: doc.id, ...doc.data() } as PublicUserProfile); });
        });
        return profiles;
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
    searchUsers: async (searchQuery: string, currentUser: User): Promise<PublicUserProfile[]> => {
        if (!searchQuery.trim()) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        const q = query(usersCollection, where('name_lowercase', '>=', lowerCaseQuery), where('name_lowercase', '<=', lowerCaseQuery + '\uf8ff'), limit(15));
        try {
            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id, name: d.name, email: d.email, role: d.role, circle: d.circle, status: d.status, bio: d.bio, profession: d.profession,
                        skills: Array.isArray(d.skills) ? d.skills : [], interests: Array.isArray(d.interests) ? d.interests : [],
                        businessIdea: d.businessIdea, isLookingForPartners: d.isLookingForPartners, lookingFor: d.lookingFor,
                        credibility_score: d.credibility_score, ccap: d.ccap, createdAt: d.createdAt,
                        pitchDeckTitle: d.pitchDeckTitle, pitchDeckSlides: d.pitchDeckSlides, publicKey: d.publicKey,
                        followers: d.followers || [], following: d.following || [], socialLinks: d.socialLinks || [],
                        ubtBalance: d.ubtBalance
                    } as PublicUserProfile;
                });
            return users.filter(u => u.id !== currentUser.id);
        } catch (error) {
            console.error("Error searching users:", error);
            throw new Error("Could not perform search at this time.");
        }
    },
    // Follow/Unfollow
    followUser: async (follower: User, targetUserId: string) => {
        try {
            const batch = writeBatch(db);
            batch.update(doc(usersCollection, follower.id), { following: arrayUnion(targetUserId) });
            batch.update(doc(usersCollection, targetUserId), { followers: arrayUnion(follower.id) });
            const notificationRef = doc(collection(db, 'users', targetUserId, 'notifications'));
            batch.set(notificationRef, {
                userId: targetUserId, message: `${follower.name} started following you.`, link: follower.id, read: false, timestamp: serverTimestamp(), type: 'NEW_FOLLOWER', causerId: follower.id
            });
            await batch.commit();
        } catch (e) { console.error("Follow failed", e); throw e; }
    },
    unfollowUser: async (followerId: string, targetUserId: string) => {
        try {
            const batch = writeBatch(db);
            batch.update(doc(usersCollection, followerId), { following: arrayRemove(targetUserId) });
            batch.update(doc(usersCollection, targetUserId), { followers: arrayRemove(followerId) });
            await batch.commit();
        } catch (error) { console.error("Unfollow user failed:", error); throw error; }
    },
    
    // --- WALLET & P2P TRANSACTIONS (The Signed Truth Architecture) ---

    processUbtTransaction: async (transaction: UbtTransaction) => {
        return runTransaction(db, async (t) => {
            const senderRef = doc(usersCollection, transaction.senderId);
            const receiverRef = doc(usersCollection, transaction.receiverId);
            const senderDoc = await t.get(senderRef);
            if (!senderDoc.exists()) throw new Error("Sender not found.");
            
            // 1. Verify Node Balance (Mirror State)
            const currentBalance = senderDoc.data().ubtBalance || 0;
            if (currentBalance < transaction.amount) throw new Error("Insufficient funds.");
            
            // 2. Cryptographic Integrity Check
            const isValid = cryptoService.verifySignature(transaction.hash, transaction.signature, transaction.senderPublicKey);
            if (!isValid) throw new Error("Protocol Signature Fault: Identity mismatch.");

            // 3. Update Mirror State (Firebase)
            t.update(senderRef, { ubtBalance: increment(-transaction.amount) });
            t.update(receiverRef, { ubtBalance: increment(transaction.amount) });
            
            // 4. Store the Truth (The Signed Log)
            // This is the permanent serverless log. Even if Balances are wiped, we replay this.
            const ledgerRef = doc(collection(db, 'ledger'), transaction.id);
            t.set(ledgerRef, { ...transaction, serverTimestamp: serverTimestamp() });
            
            // 5. Node Private Histories (Convenience Caching)
            t.set(doc(collection(db, 'users', transaction.senderId, 'transactions')), { type: 'p2p_sent', amount: transaction.amount, reason: 'Sent $UBT', timestamp: serverTimestamp(), actorId: transaction.senderId, txHash: transaction.id });
            t.set(doc(collection(db, 'users', transaction.receiverId, 'transactions')), { type: 'p2p_received', amount: transaction.amount, reason: 'Received $UBT', timestamp: serverTimestamp(), actorId: transaction.senderId, txHash: transaction.id });
        });
    },

    // --- TREASURY & VAULT INFRASTRUCTURE ---

    listenToVaults: (callback: (vaults: TreasuryVault[]) => void, onError: (e: Error) => void) => {
        return onSnapshot(vaultsCollection, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryVault))), onError);
    },

    initializeTreasury: async (admin: Admin) => {
        const TOTAL_SUPPLY = 15000000;
        const vaults: Omit<TreasuryVault, 'id'>[] = [
            { name: 'Genesis Mother Node', type: 'GENESIS', description: 'Primary protocol anchor.', balance: TOTAL_SUPPLY, publicKey: 'GENESIS_PROTOCOL_ADDR', isLocked: true },
            { name: 'Sustenance Vault', type: 'SUSTENANCE', description: 'Locked for food hamper drops.', balance: 0, publicKey: 'VAULT_SUSTENANCE_ADDR', isLocked: true },
            { name: 'Distress Reserve', type: 'DISTRESS', description: 'Emergency community aid.', balance: 0, publicKey: 'VAULT_DISTRESS_ADDR', isLocked: true },
            { name: 'Venture Seed Fund', type: 'VENTURE', description: 'Capital for member ideas.', balance: 0, publicKey: 'VAULT_VENTURE_ADDR', isLocked: true },
            { name: 'Liquid System Float', type: 'FLOAT', description: 'Rewards & referrals pool.', balance: 0, publicKey: 'VAULT_LIQUID_FLOAT_ADDR', isLocked: false },
        ];

        return runTransaction(db, async (t) => {
            const econRef = doc(globalsCollection, 'economy');
            t.set(econRef, { total_ubt_supply: TOTAL_SUPPLY, ubt_in_cvp: 0, ubt_to_usd_rate: 1.0 }, { merge: true });

            for (const vault of vaults) {
                const vaultRef = doc(vaultsCollection, vault.type);
                t.set(vaultRef, vault);
            }

            // Genesis Mint Event
            const ledgerRef = doc(collection(db, 'ledger'));
            t.set(ledgerRef, {
                id: `genesis-mint-${Date.now()}`,
                senderId: 'PROTOCOL_ORIGIN',
                receiverId: 'GENESIS',
                amount: TOTAL_SUPPLY,
                timestamp: Date.now(),
                serverTimestamp: serverTimestamp(),
                type: 'SYSTEM_MINT',
                hash: 'PROTOCOL_GENESIS_EVENT',
                signature: 'SYSTEM_SIGNED',
                senderPublicKey: 'TREASURY'
            });
        });
    },

    syncInternalVaults: async (admin: Admin, fromVault: TreasuryVault, toVault: TreasuryVault, amount: number, reason: string) => {
        return runTransaction(db, async (t) => {
            const fromRef = doc(vaultsCollection, fromVault.id);
            const toRef = doc(vaultsCollection, toVault.id);
            
            const fromDoc = await t.get(fromRef);
            const currentBal = fromDoc.data()?.balance || 0;
            if (currentBal < amount) throw new Error("Vault liquidity insufficient.");

            t.update(fromRef, { balance: increment(-amount) });
            t.update(toRef, { balance: increment(amount) });

            // Cryptographic Internal Sync Event
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payload = `${fromVault.id}:${toVault.id}:${amount}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payload);
            const txId = `sync-${Date.now()}`;

            const ledgerRef = doc(collection(db, 'ledger'), txId);
            t.set(ledgerRef, {
                id: txId,
                senderId: fromVault.id,
                receiverId: toVault.id,
                amount: amount,
                timestamp: timestamp,
                serverTimestamp: serverTimestamp(),
                nonce: nonce,
                signature: signature,
                hash: payload,
                senderPublicKey: admin.publicKey,
                type: 'VAULT_SYNC',
                status: 'verified'
            });
            
            // Global log
            t.set(doc(collection(db, 'activity')), {
                type: 'VAULT_SYNC',
                message: `Authority Node sync: ${amount} UBT moved from ${fromVault.name} to ${toVault.name}.`,
                timestamp: serverTimestamp(),
                causerId: admin.id,
                causerName: admin.name,
                causerCircle: admin.circle,
                link: 'ledger'
            });
        });
    },

    mintTestUbt: async (admin: Admin, amount: number) => {
        return runTransaction(db, async (t) => {
            const userRef = doc(usersCollection, admin.id);
            t.update(userRef, { ubtBalance: increment(amount) });
            
            const ledgerRef = doc(collection(db, 'ledger'));
            t.set(ledgerRef, { 
                id: `mint-${Date.now()}`,
                senderId: 'GENESIS',
                receiverId: admin.id,
                amount: amount,
                timestamp: Date.now(),
                serverTimestamp: serverTimestamp(),
                type: 'SYSTEM_MINT',
                hash: 'GENESIS_MINT_EVENT',
                signature: 'SYSTEM_SIGNED',
                senderPublicKey: 'TREASURY'
            });

            t.set(doc(collection(db, 'users', admin.id, 'transactions')), {
                type: 'credit',
                amount: amount,
                reason: 'Simulation Genesis Sync',
                timestamp: serverTimestamp(),
                actorId: 'SYSTEM'
            });
        });
    },
    
    getPublicLedger: async (limitCount: number = 20): Promise<any[]> => {
        try {
            const q = query(ledgerCollection, orderBy('serverTimestamp', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e: any) {
            const qFallback = query(ledgerCollection, limit(limitCount));
            const snapshot = await getDocs(qFallback);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    },

    getRichList: async (limitCount: number = 10): Promise<PublicUserProfile[]> => {
        try {
            const q = query(usersCollection, orderBy('ubtBalance', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
        } catch (e: any) {
            const qFallback = query(usersCollection, limit(limitCount));
            const snapshot = await getDocs(qFallback);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
        }
    },

    // --- PULSE HUB / EXCHANGE LOGIC ---

    listenToP2POffers: (callback: (offers: P2POffer[]) => void, onError: (e: Error) => void) => {
        const q = query(p2pCollection, where('status', 'in', ['OPEN', 'LOCKED']), orderBy('createdAt', 'desc'));
        return onSnapshot(q, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as P2POffer))), onError);
    },

    createP2POffer: async (user: User, data: Omit<P2POffer, 'id' | 'sellerId' | 'sellerName' | 'status' | 'createdAt'>) => {
        if (data.type === 'SELL') {
            return runTransaction(db, async (t) => {
                const userRef = doc(usersCollection, user.id);
                const userDoc = await t.get(userRef);
                const bal = userDoc.data()?.ubtBalance || 0;
                if (bal < data.amount) throw new Error("Insufficient funds to create offer.");

                // Lock the funds
                t.update(userRef, { ubtBalance: increment(-data.amount) });
                
                const offerRef = doc(p2pCollection);
                t.set(offerRef, {
                    ...data,
                    sellerId: user.id,
                    sellerName: user.name,
                    status: 'OPEN',
                    createdAt: serverTimestamp()
                });
            });
        } else {
            // BUY offers don't lock UBT immediately but might require a trust score or deposit
            await addDoc(p2pCollection, {
                ...data,
                sellerId: user.id,
                sellerName: user.name,
                status: 'OPEN',
                createdAt: serverTimestamp()
            });
        }
    },

    takeP2POffer: async (user: User, offerId: string) => {
        return runTransaction(db, async (t) => {
            const offerRef = doc(p2pCollection, offerId);
            const offerDoc = await t.get(offerRef);
            if (!offerDoc.exists()) throw new Error("Offer disappeared.");
            const offer = offerDoc.data() as P2POffer;
            if (offer.status !== 'OPEN') throw new Error("Offer already taken.");
            if (offer.sellerId === user.id) throw new Error("Cannot take your own offer.");

            t.update(offerRef, {
                status: 'LOCKED',
                buyerId: user.id,
                buyerName: user.name,
                lockedAt: serverTimestamp()
            });

            // Notify seller
            const notifRef = doc(collection(db, 'users', offer.sellerId, 'notifications'));
            t.set(notifRef, {
                userId: offer.sellerId, message: `${user.name} locked your P2P offer. Awaiting payment.`, link: 'pulse-hub', read: false, timestamp: serverTimestamp(), type: 'P2P_LOCKED', causerId: user.id
            });
        });
    },

    cancelP2POffer: async (user: User, offerId: string) => {
        return runTransaction(db, async (t) => {
            const offerRef = doc(p2pCollection, offerId);
            const offerDoc = await t.get(offerRef);
            if (!offerDoc.exists()) throw new Error("Offer not found.");
            const offer = offerDoc.data() as P2POffer;
            if (offer.sellerId !== user.id) throw new Error("Unauthorized.");
            if (offer.status !== 'OPEN') throw new Error("Cannot cancel a locked or completed offer.");

            if (offer.type === 'SELL') {
                const userRef = doc(usersCollection, user.id);
                t.update(userRef, { ubtBalance: increment(offer.amount) });
            }
            t.update(offerRef, { status: 'CANCELLED' });
        });
    },

    completeP2PTrade: async (user: User, offerId: string) => {
        return runTransaction(db, async (t) => {
            const offerRef = doc(p2pCollection, offerId);
            const offerDoc = await t.get(offerRef);
            const offer = offerDoc.data() as P2POffer;
            if (offer.sellerId !== user.id) throw new Error("Only the seller can confirm receipt.");
            if (offer.status !== 'LOCKED') throw new Error("Trade is not in locked state.");

            const buyerRef = doc(usersCollection, offer.buyerId!);
            
            // Release the UBT to the buyer
            t.update(buyerRef, { ubtBalance: increment(offer.amount) });
            t.update(offerRef, { status: 'COMPLETED' });

            // Store the Truth (The Signed Log)
            const ledgerRef = doc(collection(db, 'ledger'));
            t.set(ledgerRef, {
                id: `p2p-${offerId}`,
                senderId: offer.sellerId,
                receiverId: offer.buyerId,
                amount: offer.amount,
                timestamp: Date.now(),
                serverTimestamp: serverTimestamp(),
                type: 'P2P_HUB_EXCHANGE',
                hash: `P2P_EVENT_${offerId}`,
                signature: 'HUB_SETTLED',
                senderPublicKey: 'PLATFORM_ESCROW'
            });

            // History logs
            t.set(doc(collection(db, 'users', offer.sellerId, 'transactions')), { type: 'p2p_sent', amount: offer.amount, reason: `Sold $UBT via P2P Hub`, timestamp: serverTimestamp(), actorId: offer.sellerId, txHash: offerId });
            t.set(doc(collection(db, 'users', offer.buyerId!, 'transactions')), { type: 'p2p_received', amount: offer.amount, reason: `Bought $UBT via P2P Hub`, timestamp: serverTimestamp(), actorId: offer.sellerId, txHash: offerId });
        });
    },

    ammSwap: async (user: User, type: 'BUY' | 'SELL', ubtAmount: number, usdAmount: number) => {
        return runTransaction(db, async (t) => {
            const userRef = doc(usersCollection, user.id);
            const cvpRef = doc(globalsCollection, 'cvp');
            const econRef = doc(globalsCollection, 'economy');
            
            const userDoc = await t.get(userRef);
            const cvpDoc = await t.get(cvpRef);
            const econDoc = await t.get(econRef);

            const currentPrice = econDoc.data()?.ubt_to_usd_rate || 1.0;
            const priceImpact = 0.0000001; 
            const newPrice = type === 'BUY' 
                ? currentPrice + (ubtAmount * priceImpact)
                : currentPrice - (ubtAmount * priceImpact);

            if (type === 'BUY') {
                // INTERNAL swap only. Ecocash flow uses different logic.
                t.update(userRef, { ubtBalance: increment(ubtAmount) });
                t.update(cvpRef, { total_usd_value: increment(usdAmount) });
                t.update(econRef, { ubt_in_cvp: increment(-ubtAmount), ubt_to_usd_rate: Math.max(0.01, newPrice) });
            } else {
                const userBalUbt = userDoc.data()?.ubtBalance || 0;
                if (userBalUbt < ubtAmount) throw new Error("Insufficient UBT balance.");
                
                t.update(userRef, { ubtBalance: increment(-ubtAmount) });
                t.update(cvpRef, { total_usd_value: increment(-usdAmount) });
                t.update(econRef, { ubt_in_cvp: increment(ubtAmount), ubt_to_usd_rate: Math.max(0.01, newPrice) });
            }

            // Private logs
            t.set(doc(collection(db, 'users', user.id, 'transactions')), {
                type: 'amm_swap', 
                amount: ubtAmount, 
                reason: `${type} $UBT via Pulse Swap`, 
                timestamp: serverTimestamp(), 
                actorId: 'SYSTEM',
                balanceAfter: (userDoc.data()?.ubtBalance || 0) + (type === 'BUY' ? ubtAmount : -ubtAmount)
            });
        });
    },

    // --- ECOCASH PURCHASES ---

    createPendingUbtPurchase: async (user: User, amountUsd: number, amountUbt: number, ecocashRef: string) => {
        await addDoc(pendingPurchasesCollection, {
            userId: user.id,
            userName: user.name,
            amountUsd,
            amountUbt,
            ecocashRef,
            status: 'PENDING',
            createdAt: serverTimestamp()
        });
    },

    listenForPendingPurchases: (callback: (purchases: PendingUbtPurchase[]) => void, onError: (e: Error) => void) => {
        const q = query(pendingPurchasesCollection, where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as PendingUbtPurchase))), onError);
    },

    approveUbtPurchase: async (admin: User, purchase: PendingUbtPurchase) => {
        return runTransaction(db, async (t) => {
            const purchaseRef = doc(pendingPurchasesCollection, purchase.id);
            const userRef = doc(usersCollection, purchase.userId);
            const cvpRef = doc(globalsCollection, 'cvp');
            const econRef = doc(globalsCollection, 'economy');

            t.update(purchaseRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
            t.update(userRef, { ubtBalance: increment(purchase.amountUbt) });
            t.update(cvpRef, { total_usd_value: increment(purchase.amountUsd) });
            t.update(econRef, { ubt_in_cvp: increment(-purchase.amountUbt) });

            // Store the Truth (The Signed Log)
            const ledgerRef = doc(collection(db, 'ledger'));
            t.set(ledgerRef, {
                senderId: 'TREASURY',
                receiverId: purchase.userId,
                amount: purchase.amountUbt,
                type: 'ECOCASH_ACQUISITION',
                timestamp: Date.now(),
                serverTimestamp: serverTimestamp(),
                id: `ec-${purchase.id}`,
                hash: `ECOCASH_REF_${purchase.ecocashRef}`,
                signature: 'TREASURY_SYNCED',
                senderPublicKey: 'SYSTEM_ORACLE'
            });

            // History
            t.set(doc(collection(db, 'users', purchase.userId, 'transactions')), {
                type: 'credit',
                amount: purchase.amountUbt,
                reason: 'UBT Acquired via Ecocash',
                timestamp: serverTimestamp(),
                actorId: admin.id,
                txHash: purchase.id
            });
        });
    },

    rejectUbtPurchase: async (purchaseId: string) => {
        await updateDoc(doc(pendingPurchasesCollection, purchaseId), { status: 'REJECTED' });
    },

    // --- SELL PROTOCOL / LIQUIDATION ---

    createSellRequest: async (user: User, amountUbt: number, amountUsd: number) => {
        return runTransaction(db, async (t) => {
            const userRef = doc(usersCollection, user.id);
            const userDoc = await t.get(userRef);
            const bal = userDoc.data()?.ubtBalance || 0;
            if (bal < amountUbt) throw new Error("Insufficient node assets for liquidation.");

            // Deduct immediately (Escrow Lock)
            t.update(userRef, { ubtBalance: increment(-amountUbt) });

            const sellRef = doc(sellRequestsCollection);
            t.set(sellRef, {
                userId: user.id,
                userName: user.name,
                userPhone: user.phone || 'N/A',
                amountUbt,
                amountUsd,
                status: 'PENDING',
                createdAt: serverTimestamp()
            });

            // History
            t.set(doc(collection(db, 'users', user.id, 'transactions')), {
                type: 'liquidation_lock',
                amount: amountUbt,
                reason: 'Assets Locked for Liquidation Protocol',
                timestamp: serverTimestamp(),
                actorId: 'SYSTEM',
                txHash: sellRef.id
            });
        });
    },

    listenToSellRequests: (callback: (requests: SellRequest[]) => void, onError: (e: Error) => void) => {
        const q = query(sellRequestsCollection, where('status', 'in', ['PENDING', 'CLAIMED', 'DISPATCHED']), orderBy('createdAt', 'desc'));
        return onSnapshot(q, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest))), onError);
    },

    claimSellRequest: async (user: User, requestId: string) => {
        const ref = doc(sellRequestsCollection, requestId);
        await updateDoc(ref, {
            status: 'CLAIMED',
            claimerId: user.id,
            claimerName: user.name,
            claimerRole: user.role,
            claimedAt: serverTimestamp()
        });
    },

    dispatchSellPayment: async (user: User, requestId: string, ecocashRef: string) => {
        const ref = doc(sellRequestsCollection, requestId);
        await updateDoc(ref, {
            status: 'DISPATCHED',
            ecocashRef,
            dispatchedAt: serverTimestamp()
        });
    },

    completeSellRequest: async (user: User, request: SellRequest) => {
        return runTransaction(db, async (t) => {
            const sellRef = doc(sellRequestsCollection, request.id);
            const claimerRef = doc(usersCollection, request.claimerId!);
            const cvpRef = doc(globalsCollection, 'cvp');
            const econRef = doc(globalsCollection, 'economy');

            t.update(sellRef, { status: 'COMPLETED', completedAt: serverTimestamp() });

            // If it was an agent claiming, they get the UBT. 
            // If admin, it's burned/returned to pool
            if (request.claimerRole === 'agent') {
                t.update(claimerRef, { ubtBalance: increment(request.amountUbt) });
                // Agent log
                t.set(doc(collection(db, 'users', request.claimerId!, 'transactions')), {
                    type: 'credit', amount: request.amountUbt, reason: 'UBT Acquired via Liquidation Bounty', timestamp: serverTimestamp(), actorId: request.userId, txHash: request.id
                });
            } else {
                // Return to treasury
                t.update(cvpRef, { total_usd_value: increment(-request.amountUsd) });
                t.update(econRef, { ubt_in_cvp: increment(request.amountUbt) });
            }

            // Store the Truth (The Signed Log)
            t.set(doc(collection(db, 'ledger')), {
                senderId: request.userId,
                receiverId: request.claimerId || 'TREASURY',
                amount: request.amountUbt,
                type: 'LIQUIDATION_SETTLEMENT',
                timestamp: Date.now(),
                serverTimestamp: serverTimestamp(),
                id: `liq-${request.id}`,
                hash: `LIQUIDATION_EVENT_${request.id}`,
                signature: 'SETTLED',
                senderPublicKey: 'SYSTEM_ESCROW'
            });

            // Member final log
            t.set(doc(collection(db, 'users', request.userId, 'transactions')), {
                type: 'liquidation_settled',
                amount: request.amountUbt,
                reason: 'Liquidation Protocol Settled',
                timestamp: serverTimestamp(),
                actorId: request.claimerId || 'TREASURY',
                txHash: request.id
            });
        });
    },

    cancelSellRequest: async (user: User, requestId: string) => {
        return runTransaction(db, async (t) => {
            const sellRef = doc(sellRequestsCollection, requestId);
            const sellDoc = await t.get(sellRef);
            const req = sellDoc.data() as SellRequest;
            if (req.status !== 'PENDING') throw new Error("Cannot cancel a claimed protocol.");

            t.update(sellRef, { status: 'CANCELLED' });
            t.update(doc(usersCollection, user.id), { ubtBalance: increment(req.amountUbt) });
        });
    },

    // Admin
    listenForAllUsers: (adminUser: User, callback: (users: User[]) => void, onError: (error: Error) => void) => onSnapshot(query(usersCollection, orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), onError),
    listenForAllMembers: (adminUser: User, callback: (members: Member[]) => void, onError: (error: Error) => void) => onSnapshot(query(membersCollection, orderBy('date_registered', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), onError),
    listenForAllAgents: (adminUser: User, callback: (agents: Agent[]) => void, onError: (error: Error) => void) => onSnapshot(query(usersCollection, where('role', '==', 'agent')), s => {
        const agents = s.docs.map(d => ({ id: d.id, ...d.data() } as Agent));
        agents.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        callback(agents);
    }, onError),
    listenForPendingMembers: (adminUser: User, callback: (members: Member[]) => void, onError: (error: Error) => void) => onSnapshot(query(membersCollection, where('payment_status', '==', 'pending_verification'), orderBy('date_registered', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), onError),
    updateUserRole: (adminUser: User, userId: string, newRole: User['role']) => updateDoc(doc(db, 'users', userId), { role: newRole }),
    getAgentMembers: async (agent: Agent): Promise<Member[]> => {
        const q = query(membersCollection, where('agent_id', '==', agent.id));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
    },
    registerMember: async (agent: Agent, memberData: NewMember): Promise<Member> => {
        const welcomeMessage = await generateWelcomeMessage(memberData.full_name, memberData.circle);
        const newMemberForFirestore = {
            ...memberData, agent_id: agent.id, agent_name: agent.name, date_registered: serverTimestamp(),
            welcome_message: welcomeMessage, membership_card_id: `UGC-M-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        };
        const docRef = await addDoc(membersCollection, newMemberForFirestore);
        return { id: docRef.id, ...memberData, agent_id: agent.id, agent_name: agent.name, date_registered: Timestamp.now(), welcome_message: welcomeMessage, membership_card_id: newMemberForFirestore.membership_card_id } as Member;
    },
    processPendingWelcomeMessages: async () => 0,
    listenForReferredUsers: (userId: string, callback: (users: PublicUserProfile[]) => void, onError: (error: Error) => void) => {
        return onSnapshot(doc(usersCollection, userId), async (userSnap) => {
            try {
                if (!userSnap.exists()) { callback([]); return; }
                const referralCode = userSnap.data().referralCode;
                if (!referralCode) { callback([]); return; }
                const q = query(usersCollection, where('referredBy', '==', referralCode));
                const referredSnapshot = await getDocs(q);
                callback(referredSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as PublicUserProfile));
            } catch (error) { onError(error as Error); }
        }, onError);
    },
    updateMemberProfile: (memberId: string, data: Partial<Member>) => updateDoc(doc(membersCollection, memberId), data),
    
    approveMemberAndCreditUbt: async (admin: User, member: Member) => {
        if (!member.uid) throw new Error("Member profile inactive.");
        return runTransaction(db, async (t) => {
            const memberRef = doc(membersCollection, member.id);
            const userRef = doc(usersCollection, member.uid!);
            t.update(memberRef, { payment_status: 'complete' });
            t.update(userRef, { status: 'active', ubtBalance: increment(100), initialUbtStake: 100 });
        });
    },

    rejectMember: (admin: User, member: Member) => updateDoc(doc(membersCollection, member.id), { payment_status: 'rejected' }),
    updatePaymentStatus: (admin: User, memberId: string, status: Member['payment_status']) => updateDoc(doc(membersCollection, memberId), { payment_status: status }),
    resetDistressQuota: (admin: User, userId: string) => updateDoc(doc(usersCollection, userId), { distress_calls_available: 1 }),
    clearLastDistressPost: (admin: User, userId: string) => updateDoc(doc(usersCollection, userId), { last_distress_call: null }),
    getBroadcasts: async (): Promise<Broadcast[]> => {
        const q = query(broadcastsCollection, orderBy('date', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast));
    },
    sendBroadcast: async (user: User, message: string): Promise<Broadcast> => {
        const newBroadcast: Omit<Broadcast, 'id'> = { authorId: user.id, authorName: user.name, message, date: new Date().toISOString() };
        const docRef = await addDoc(broadcastsCollection, newBroadcast);
        return { id: docRef.id, ...newBroadcast };
    },
    createPost: async (user: User, content: string, type: Post['types'], ccapToAward: number, requiredSkills: string[] = []) => {
        const batch = writeBatch(db);
        const postRef = doc(collection(db, 'posts'));
        const newPost: Omit<Post, 'id'> = { authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role, content, date: new Date().toISOString(), upvotes: [], types: type, requiredSkills: requiredSkills };
        batch.set(postRef, newPost);
        await batch.commit();
    },
    repostPost: async (originalPost: Post, user: User, comment: string) => {
        const batch = writeBatch(db);
        const newPostRef = doc(postsCollection);
        const originalPostRef = doc(postsCollection, originalPost.id);
        const repost: Omit<Post, 'id'> = { authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role, content: comment, date: new Date().toISOString(), upvotes: [], types: 'general', repostedFrom: { authorId: originalPost.authorId, authorName: originalPost.authorName, authorCircle: originalPost.authorCircle, content: originalPost.content, date: originalPost.date } };
        batch.set(repost, newPostRef);
        batch.update(originalPostRef, { repostCount: increment(1) });
        await batch.commit();
    },
    sendDistressPost: async (user: MemberUser, content: string) => {
        if (user.distress_calls_available <= 0) throw new Error("No distress quota remaining.");
        const postRef = doc(postsCollection);
        const newPost: Omit<Post, 'id'> = { authorId: user.id, authorName: `Anonymous Member`, authorCircle: user.circle, authorRole: user.role, content, date: new Date().toISOString(), upvotes: [], types: 'distress' };
        await setDoc(postRef, newPost);
    },
    getRecentPosts: async (count: number): Promise<Post[]> => {
        const publicTypes = ['general', 'proposal', 'offer', 'opportunity'];
        const q = query(postsCollection, where('types', 'in', publicTypes), orderBy('date', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
    },
    deleteDistressPost: (admin: User, postId: string, authorId: string) => _deletePostAndSubcollections(postId),
    deletePost: (postId: string) => _deletePostAndSubcollections(postId),
    updatePost: (postId: string, content: string) => updateDoc(doc(postsCollection, postId), { content }),
    upvotePost: async (postId: string, userId: string) => {
        const postRef = doc(postsCollection, postId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const upvotes = postDoc.data().upvotes || [];
            if (upvotes.includes(userId)) await updateDoc(postRef, { upvotes: arrayRemove(userId) });
            else await updateDoc(postRef, { upvotes: arrayUnion(userId) });
        }
    },
    fetchPinnedPosts: async (isAdmin: boolean): Promise<Post[]> => {
        const publicTypes = ['general', 'proposal', 'offer', 'opportunity'];
        const queries = [query(postsCollection, where('isPinned', '==', true), where('types', 'in', publicTypes))];
        if (isAdmin) queries.push(query(postsCollection, where('isPinned', '==', true), where('types', '==', 'distress')));
        const allResults = await Promise.all(queries.map(q => getDocs(q)));
        const allPosts = allResults.flatMap(snapshot => snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        return allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    fetchRegularPosts: async (count: number, filter: string, isAdmin: boolean, start?: DocumentSnapshot<DocumentData>, currentUser?: User) => {
        const publicTypes = ['general', 'proposal', 'offer', 'opportunity'];
        let finalQuery;
        if (filter === 'all') {
            const typesToQuery = isAdmin ? [...publicTypes, 'distress'] : publicTypes;
            const constraints: any[] = [ where('types', 'in', typesToQuery), orderBy('date', 'desc'), limit(count) ];
            if (start) constraints.push(startAfter(start));
            finalQuery = query(postsCollection, ...constraints);
        } else if (filter === 'following' && currentUser && currentUser.following && currentUser.following.length > 0) {
            const constraints: any[] = [ where('authorId', 'in', currentUser.following.slice(0, 10)), orderBy('date', 'desc'), limit(count) ];
            if (start) constraints.push(startAfter(start));
            finalQuery = query(postsCollection, ...constraints);
        } else if (filter === 'following') {
             return { posts: [], lastVisible: null };
        } else {
             const constraints: any[] = [ where('types', '==', filter), orderBy('date', 'desc'), limit(count) ];
             if (start) constraints.push(startAfter(start));
             finalQuery = query(postsCollection, ...constraints);
        }
        const snapshot = await getDocs(finalQuery);
        const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
        return { posts, lastVisible };
    },
    listenForPostsByAuthor: (authorId: string, callback: (posts: Post[]) => void, onError: (error: Error) => void) => {
        const q = query(postsCollection, where('authorId', '==', authorId), orderBy('date', 'desc'));
        return onSnapshot(q, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), onError);
    },
    togglePinPost: (admin: User, postId: string, pin: boolean) => updateDoc(doc(postsCollection, postId), { isPinned: pin }),
    listenForComments: (parentId: string, callback: (comments: Comment[]) => void, parentCollection: 'posts' | 'proposals', onError: (error: Error) => void) => 
        onSnapshot(query(collection(db, parentCollection, parentId, 'comments'), orderBy('timestamp', 'asc')), (snapshot) => { callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment))); }, onError),
    addComment: (parentId: string, commentData: Omit<Comment, 'id' | 'timestamp'>, parentCollection: 'posts' | 'proposals') => {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, parentCollection, parentId, 'comments')), { ...commentData, timestamp: serverTimestamp() });
        batch.update(doc(db, parentCollection, parentId), { commentCount: increment(1) });
        return batch.commit();
    },
    deleteComment: (parentId: string, commentId: string, parentCollection: 'posts' | 'proposals') => {
        const batch = writeBatch(db);
        batch.delete(doc(db, parentCollection, parentId, 'comments', commentId));
        return batch.commit();
    },
    upvoteComment: async (parentId: string, commentId: string, userId: string, parentCollection: 'posts' | 'proposals') => {
        const ref = doc(db, parentCollection, parentId, 'comments', commentId);
        const docSnap = await getDoc(ref);
        if (docSnap.exists() && (docSnap.data().upvotes || []).includes(userId)) await updateDoc(ref, { upvotes: arrayRemove(userId) });
        else await updateDoc(ref, { upvotes: arrayUnion(userId) });
    },
    reportPost: (reporter: User, post: Post, reason: string, details: string) => addDoc(reportsCollection, { reporterId: reporter.id, reporterName: reporter.name, reportedUserId: post.authorId, reportedUserName: post.authorName, postId: post.id, postContent: post.content, postAuthorId: post.authorId, reason, details, date: new Date().toISOString(), status: 'new' }),
    reportUser: (reporter: User, reportedUser: PublicUserProfile, reason: string, details: string) => addDoc(reportsCollection, { reporterId: reporter.id, reporterName: reporter.name, reportedUserId: reportedUser.id, reportedUserName: reportedUser.name, reason, details, date: new Date().toISOString(), status: 'new' }),
    listenForReports: (admin: User, callback: (reports: Report[]) => void, onError: (error: Error) => void) => onSnapshot(query(reportsCollection, orderBy('date', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))), onError),
    resolvePostReport: async (admin: User, reportId: string, postId: string, authorId: string) => {
        const batch = writeBatch(db);
        batch.update(doc(reportsCollection, reportId), { status: 'resolved' });
        batch.delete(doc(postsCollection, postId));
        batch.update(doc(usersCollection, authorId), { credibility_score: increment(-25) });
        await batch.commit();
    },
    dismissReport: (admin: User, reportId: string) => updateDoc(doc(reportsCollection, reportId), { status: 'resolved' }),
    listenForConversations: (userId: string, callback: (convos: Conversation[]) => void, onError: (error: Error) => void) => 
        onSnapshot(query(conversationsCollection, where('members', 'array-contains', userId)), (snapshot) => {
                const conversations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
                conversations.sort((a, b) => (b.lastMessageTimestamp?.toMillis() || 0) - (a.lastMessageTimestamp?.toMillis() || 0));
                callback(conversations);
            }, onError),
    
    startChat: async (currentUser: User, targetUser: PublicUserProfile): Promise<Conversation> => {
        const currentUserId = currentUser.id;
        const targetUserId = targetUser.id;
        const q = query(conversationsCollection, where('members', 'array-contains', currentUserId));
        const querySnapshot = await getDocs(q);
        const existingConvoDoc = querySnapshot.docs.find(doc => {
            const data = doc.data();
            return data.isGroup === false && data.members.includes(targetUserId);
        });
        if (existingConvoDoc) return { id: existingConvoDoc.id, ...existingConvoDoc.data() } as Conversation;
        const convoId = [currentUserId, targetUserId].sort().join('_');
        const convoRef = doc(conversationsCollection, convoId);
        const newConvoData = {
            members: [currentUserId, targetUserId], memberNames: { [currentUserId]: currentUser.name, [targetUserId]: targetUser.name }, 
            lastMessage: "Conversation started", lastMessageTimestamp: Timestamp.now(), lastMessageSenderId: currentUserId, 
            readBy: [currentUserId], isGroup: false
        };
        await setDoc(convoRef, newConvoData);
        return { id: convoId, ...newConvoData } as Conversation;
    },
    createGroupChat: async (name: string, memberIds: string[], memberNames: {[key: string]: string}) => {
        await addDoc(conversationsCollection, { name, members: memberIds, memberNames, lastMessage: "Group created", lastMessageTimestamp: Timestamp.now(), lastMessageSenderId: memberIds[0], readBy: [memberIds[0]], isGroup: true });
    },
    listenForMessages: (convoId: string, currentUser: User, callback: (messages: Message[]) => void, onError: (error: Error) => void) => {
        return onSnapshot(query(collection(db, 'conversations', convoId, 'messages'), orderBy('timestamp', 'asc')), (snapshot) => {
            callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
        }, onError);
    },
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
    listenForNotifications: (userId: string, callback: (notifs: Notification[]) => void, onError: (error: Error) => void) => onSnapshot(query(collection(db, 'users', userId, 'notifications'), limit(50)), (s) => { callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Notification)).sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))); }, onError),
    listenForActivity: (circle: string, callback: (acts: Activity[]) => void, onError: (error: Error) => void) => onSnapshot(query(activityCollection, where('causerCircle', '==', circle), limit(50)), (snapshot) => { callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)).sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)).slice(0, 10)); }, onError),
    listenForRecentActivity: (count: number, callback: (acts: Activity[]) => void, onError: (error: Error) => void) => onSnapshot(query(activityCollection, orderBy('timestamp', 'desc'), limit(count)), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), onError),
    listenForAllNewMemberActivity: (callback: (acts: Activity[]) => void, onError: (error: Error) => void) => onSnapshot(query(activityCollection, where('type', '==', 'NEW_MEMBER'), orderBy('timestamp', 'desc'), limit(10)), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), onError),
    markNotificationAsRead: (userId: string, notificationId: string) => updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true }),
    markAllNotificationsAsRead: async (userId: string) => {
        const q = query(collection(db, 'users', userId, 'notifications'), where('read', '==', false));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },
    listenForProposals: (callback: (proposals: Proposal[]) => void, onError: (error: Error) => void) => onSnapshot(query(proposalsCollection, orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), onError),
    getProposal: async (id: string): Promise<Proposal | null> => { const docSnap = await getDoc(doc(proposalsCollection, id)); return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Proposal : null; },
    createProposal: (user: User, data: {title: string; description: string}) => addDoc(proposalsCollection, { ...data, authorId: user.id, authorName: user.name, createdAt: serverTimestamp(), status: 'active', votesFor: [], votesAgainst: [], voteCountFor: 0, voteCountAgainst: 0 }),
    voteOnProposal: (proposalId: string, userId: string, vote: 'for' | 'against') => {
        return runTransaction(db, async (t) => {
            const proposalRef = doc(proposalsCollection, proposalId);
            const proposalDoc = await t.get(proposalRef);
            if (!proposalDoc.exists()) throw new Error("Proposal not found.");
            const data = proposalDoc.data();
            if (data.votesFor.includes(userId) || data.votesAgainst.includes(userId)) throw new Error("User has already voted.");
            if (vote === 'for') t.update(proposalRef, { votesFor: arrayUnion(userId), voteCountFor: increment(1) });
            else t.update(proposalRef, { votesAgainst: arrayUnion(userId), voteCountAgainst: increment(1) });
        });
    },
    closeProposal: (user: User, proposalId: string, status: 'passed' | 'failed') => updateDoc(doc(proposalsCollection, proposalId), { status }),
    getCurrentRedemptionCycle: async (): Promise<RedemptionCycle | null> => { const q = query(redemptionCyclesCollection, orderBy('endDate', 'desc'), limit(1)); const snapshot = await getDocs(q); return snapshot.empty ? null : {id: snapshot.docs[0].id, ...snapshot.docs[0].data()} as RedemptionCycle; },
    listenForUserPayouts: (userId: string, callback: (payouts: PayoutRequest[]) => void, onError: (error: Error) => void) => onSnapshot(query(payoutsCollection, where('userId', '==', userId)), (snapshot) => { callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest)).sort((a, b) => (a.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0))); }, onError),
    requestPayout: (user: User, ecocashName: string, ecocashNumber: string, amount: number) => addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'referral', amount, ecocashName, ecocashNumber, status: 'pending', requestedAt: serverTimestamp() }),
    claimBonusPayout: (payoutId: string, ecocashName: string, ecocashNumber: string) => updateDoc(doc(payoutsCollection, payoutId), { ecocashName, ecocashNumber }),
    requestCommissionPayout: (user: User, ecocashName: string, ecocashNumber: string, amount: number) => {
        return runTransaction(db, async (t) => {
            t.set(doc(collection(db, 'payouts')), { userId: user.id, userName: user.name, type: 'commission', amount, ecocashName, ecocashNumber, status: 'pending', requestedAt: serverTimestamp() });
            t.update(doc(usersCollection, user.id), { commissionBalance: 0 });
        });
    },
    listenForPayoutRequests: (admin: User, callback: (reqs: PayoutRequest[]) => void, onError: (error: Error) => void) => onSnapshot(query(payoutsCollection, orderBy('requestedAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), onError),
    updatePayoutStatus: (adminUser: User, payout: PayoutRequest, status: 'completed' | 'rejected') => {
        return runTransaction(db, async (t) => {
            t.update(doc(payoutsCollection, payout.id), { status, processedBy: { adminId: adminUser.id, adminName: adminUser.name }, completedAt: serverTimestamp() });
            if (status === 'rejected') {
                let amountToRefund: number | undefined;
                if (payout.type === 'onchain_withdrawal') amountToRefund = payout.amount;
                else if (payout.type === 'ubt_redemption') amountToRefund = payout.meta?.ubtAmount;
                if (amountToRefund && amountToRefund > 0) {
                    t.update(doc(usersCollection, payout.userId), { ubtBalance: increment(amountToRefund) });
                    t.set(doc(collection(db, 'users', payout.userId, 'transactions')), { type: 'credit', amount: amountToRefund, reason: `Reversal for rejected ${payout.type.replace(/_/g, ' ')}`, timestamp: serverTimestamp(), actorId: adminUser.id, actorName: adminUser.name });
                }
            }
        });
    },
    // Economy CCAP Actions
    redeemCcapForCash: (user: User, ecocashName: string, ecocashNumber: string, usdtValue: number, ccapToRedeem: number, ccap_to_usd_rate: number) => {
        return addDoc(collection(db, 'payouts'), {
            userId: user.id, userName: user.name, type: 'ccap_redemption', amount: usdtValue, status: 'pending', requestedAt: serverTimestamp(), ecocashName, ecocashNumber,
            meta: { ccapAmount: ccapToRedeem, ccapToUsdRate: ccap_to_usd_rate }
        });
    },
    stakeCcapForNextCycle: (user: MemberUser) => {
        return updateDoc(doc(db, 'users', user.id), { lastCycleChoice: 'staked' });
    },
    convertCcapToVeq: (user: MemberUser, venture: Venture, ccapAmount: number, ccapRate: number) => {
        return runTransaction(db, async (t) => {
            const userRef = doc(db, 'users', user.id);
            const ventureRef = doc(db, 'ventures', venture.id);
            const ventureDoc = await t.get(ventureRef);
            if (!ventureDoc.exists()) throw new Error("Venture not found.");
            
            const ticker = ventureDoc.data().ticker || 'VEQ';
            // Conversion logic for simulation
            const shares = Math.floor(ccapAmount * ccapRate * 100); 
            
            t.update(userRef, {
                lastCycleChoice: 'invested',
                ventureEquity: arrayUnion({
                    ventureId: venture.id,
                    ventureName: venture.name,
                    ventureTicker: ticker,
                    shares: shares
                })
            });
            
            t.update(ventureRef, {
                fundingRaisedCcap: increment(ccapAmount),
                backers: arrayUnion(user.id)
            });
        });
    },
    getSustenanceFund: async (): Promise<SustenanceCycle | null> => { const docSnap = await getDoc(doc(sustenanceCollection, 'current')); return docSnap.exists() ? docSnap.data() as SustenanceCycle : null; },
    getAllSustenanceVouchers: async (): Promise<SustenanceVoucher[]> => { const snapshot = await getDocs(query(vouchersCollection, orderBy('issuedAt', 'desc'), limit(100))); return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher)); },
    initializeSustenanceFund: (admin: User, balance: number, cost: number) => setDoc(doc(sustenanceCollection, 'current'), { slf_balance: balance, hamper_cost: cost, last_run: serverTimestamp(), next_run: serverTimestamp() }),
    runSustenanceLottery: (admin: User): Promise<{ winners_count: number }> => Promise.resolve({ winners_count: 0 }),
    performDailyCheckin: async (userId: string): Promise<void> => {
        const userRef = doc(usersCollection, userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return;
        const data = userDoc.data();
        const lastCheckin = data.lastDailyCheckin;
        const now = Timestamp.now();
        if (lastCheckin) {
            const diff = now.toMillis() - lastCheckin.toMillis();
            if (diff < 86400000) return;
        }
        await updateDoc(userRef, { scap: increment(10), lastDailyCheckin: serverTimestamp() });
    },
    submitPriceVerification: (userId: string, item: string, price: number, shop: string) => setDoc(doc(collection(db, 'price_verifications')), { userId, item, price, shop, date: serverTimestamp() }),
    redeemVoucher: async (vendor: User, voucherId: string): Promise<number> => {
        return runTransaction(db, async t => {
            const voucherRef = doc(vouchersCollection, voucherId);
            const voucherDoc = await t.get(voucherRef);
            if (!voucherDoc.exists()) throw new Error("Voucher not found.");
            const data = voucherDoc.data();
            if (data.status !== 'active') throw new Error(`Voucher is already ${data.status}.`);
            if (data.expiresAt.toDate() < new Date()) throw new Error("Voucher has expired.");
            t.update(voucherRef, { status: 'redeemed', redeemedAt: serverTimestamp(), redeemedBy: vendor.id });
            return data.value;
        });
    },
    getVentureMembers: async (count: number): Promise<{ users: PublicUserProfile[] }> => {
        const q = query(usersCollection, where('role', '==', 'member'), limit(count > 500 ? 500 : count));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile));
        return { users: users.filter(u => u.isLookingForPartners === true) };
    },
    getFundraisingVentures: async (): Promise<Venture[]> => { const q = query(venturesCollection, where('status', '==', 'fundraising'), orderBy('createdAt', 'desc')); const snapshot = await getDocs(q); return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Venture)); },
    listenForFundraisingVentures: (callback: (ventures: Venture[]) => void, onError: (e: Error) => void) => onSnapshot(query(venturesCollection, where('status', '==', 'fundraising'), orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), onError),
    listenForUserVentures: (userId: string, callback: (ventures: Venture[]) => void, onError: (e: Error) => void) => onSnapshot(query(venturesCollection, where('ownerId', '==', userId)), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture)).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))), onError),
    createVenture: async (ventureData: any) => {
        await addDoc(venturesCollection, { ...ventureData, status: 'fundraising', createdAt: Timestamp.now(), fundingRaisedCcap: 0, backers: [], ticker: ventureData.name.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 100), totalSharesIssued: 0, totalProfitsDistributed: 0 });
    },
    deleteVenture: async (user: User, ventureId: string) => {
        const ventureRef = doc(venturesCollection, ventureId);
        const ventureDoc = await getDoc(ventureRef);
        if (!ventureDoc.exists()) throw new Error("Venture not found.");
        const venture = ventureDoc.data() as Venture;
        if (venture.ownerId !== user.id) throw new Error("Unauthorized.");
        if (venture.backers && venture.backers.length > 0) throw new Error("Cannot delete funded venture.");
        await deleteDoc(ventureRef);
    },
    listenForVentures: (admin: User, callback: (ventures: Venture[]) => void, onError: (e: Error) => void) => onSnapshot(query(venturesCollection, orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), onError),
    getVentureById: async (id: string): Promise<Venture | null> => { const docSnap = await getDoc(doc(venturesCollection, id)); return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Venture : null; },
    getDistributionsForUserInVenture: async (userId: string, ventureId: string, userShares: number, totalShares: number): Promise<Distribution[]> => { const snapshot = await getDocs(query(collection(db, 'ventures', ventureId, 'distributions'), orderBy('date', 'desc'))); return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Distribution)); },
    requestVeqPayout: (user: User, holding: VentureEquityHolding, shares: number, ecocashName: string, ecocashNumber: string) => addDoc(payoutsCollection, { userId: user.id, userName: user.name, type: 'veq_redemption', amount: shares, ecocashName, ecocashNumber, status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: holding.ventureId, ventureName: holding.ventureName } }),
    awardKnowledgePoints: async (userId: string): Promise<boolean> => {
        const userRef = doc(usersCollection, userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && !userDoc.data().hasReadKnowledgeBase) {
            await updateDoc(userRef, { hasReadKnowledgeBase: true });
            return true;
        }
        return false;
    },
    getCommunityValuePool: async (): Promise<CommunityValuePool> => { const docSnap = await getDoc(doc(globalsCollection, 'cvp')); return docSnap.exists() ? docSnap.data() as CommunityValuePool : { id: 'singleton', total_usd_value: 0, total_circulating_ccap: 0, ccap_to_usd_rate: 0.01 }; },
    listenForCVP: (admin: User, callback: (cvp: CommunityValuePool | null) => void, onError: (e: Error) => void) => onSnapshot(doc(globalsCollection, 'cvp'), s => callback(s.exists() ? s.data() as CommunityValuePool : null), onError),
    addFundsToCVP: (admin: User, amount: number) => runTransaction(db, async t => { const cvpRef = doc(globalsCollection, 'cvp'); const cvpDoc = await t.get(cvpRef); const newTotal = (cvpDoc.data()?.total_usd_value || 0) + amount; t.set(cvpRef, { total_usd_value: newTotal }, { merge: true }); }),
    listenForUserTransactions: (userId: string, callback: (txs: Transaction[]) => void, onError: (error: Error) => void) => onSnapshot(query(collection(db, 'users', userId, 'transactions'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => { callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))); }, onError),
    listenForGlobalEconomy: (callback: (economy: GlobalEconomy | null) => void, onError: (error: Error) => void) => onSnapshot(doc(globalsCollection, 'economy'), (snapshot) => { callback(snapshot.exists() ? snapshot.data() as GlobalEconomy : null); }, onError),
    setGlobalEconomy: (adminUser: User, data: Partial<GlobalEconomy>) => setDoc(doc(globalsCollection, 'economy'), data, { merge: true }),
    updateUbtRedemptionWindow: (adminUser: User, open: boolean) => {
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
    updateUserUbt: (adminUser: Admin, userId: string, amount: number, reason: string) => {
        return runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const transactionLogRef = doc(collection(db, 'users', userId, 'transactions'));
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error(`User profile for ID ${userId} not found.`);
            const currentBalance = userDoc.data().ubtBalance || 0;
            const newBalance = currentBalance + amount;
            if (newBalance < 0) throw new Error(`Insufficient balance.`);
            transaction.update(userRef, { ubtBalance: newBalance });
            transaction.set(transactionLogRef, {
                type: amount > 0 ? 'credit' : 'debit',
                amount: Math.abs(amount),
                reason: reason,
                timestamp: serverTimestamp(),
                actorId: adminUser.id,
                actorName: adminUser.name,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
            });
        });
    },
    requestUbtRedemption: (user: User, ubtAmount: number, usdValue: number, ecocashName: string, ecocashNumber: string) => {
        return runTransaction(db, async (t) => {
            const payoutRef = doc(collection(db, 'payouts'));
            const userRef = doc(usersCollection, user.id);
            const txRef = doc(collection(db, 'users', user.id, 'transactions'));
            
            t.set(payoutRef, { userId: user.id, userName: user.name, type: 'ubt_redemption', amount: usdValue, status: 'pending', requestedAt: serverTimestamp(), ecocashName, ecocashNumber, meta: { ubtAmount: ubtAmount, ubtToUsdRate: ubtAmount > 0 ? usdValue / ubtAmount : 0 } });
            t.update(userRef, { ubtBalance: increment(-ubtAmount) });
            t.set(txRef, { type: 'debit', amount: ubtAmount, reason: 'UBT redemption request', timestamp: serverTimestamp(), actorId: user.id, actorName: user.name });
        });
    },
    requestOnchainWithdrawal: (user: User, ubtAmount: number, solanaAddress: string) => {
        return runTransaction(db, async (t) => {
             const payoutRef = doc(collection(db, 'payouts'));
             const userRef = doc(usersCollection, user.id);
             const txRef = doc(collection(db, 'users', user.id, 'transactions'));
             
            t.set(payoutRef, { userId: user.id, userName: user.name, type: 'onchain_withdrawal', amount: ubtAmount, status: 'pending', requestedAt: serverTimestamp(), ecocashName: 'N/A', ecocashNumber: 'N/A', meta: { solanaAddress: solanaAddress } });
            t.update(userRef, { ubtBalance: increment(-ubtAmount) });
            t.set(txRef, { type: 'debit', amount: ubtAmount, reason: 'On-chain withdrawal request', timestamp: serverTimestamp(), actorId: user.id, actorName: user.name });
        });
    },
};
