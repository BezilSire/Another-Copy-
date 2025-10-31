import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
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
  collectionGroup,
} from 'firebase/firestore';
import {
    getDatabase,
    ref,
    onValue,
    set,
    onDisconnect,
    serverTimestamp as rtdbServerTimestamp
} from 'firebase/database';
import { auth, db, rtdb } from './firebase';
import { generateAgentCode, generateReferralCode } from '../utils';
import { generateWelcomeMessage } from './geminiService';
import { 
    User, Agent, Member, NewMember, MemberUser, Broadcast, Post,
    Comment, Report, Conversation, Message, Notification, Activity,
    Proposal, NewPublicMemberData, PublicUserProfile, RedemptionCycle, PayoutRequest, SustenanceCycle, SustenanceVoucher, Venture, CommunityValuePool, VentureEquityHolding, 
    Distribution,
    CreatorContent
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

// Helper function for robust post deletion
const _deletePostAndSubcollections = async (postId: string) => {
    const postRef = doc(postsCollection, postId);
    const commentsSnapshot = await getDocs(collection(db, 'posts', postId, 'comments'));

    const batch = writeBatch(db);

    // Delete all comments in the subcollection
    commentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // Delete the main post document
    batch.delete(postRef);

    await batch.commit();
};


// The main export of this file
export const api = {
    // Auth
    login: (email: string, password: string): Promise<FirebaseUser> => {
        return signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => userCredential.user);
    },
    logout: () => signOut(auth),
    signup: async (name: string, email: string, password: string, circle: string): Promise<void> => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user } = userCredential;
        await sendEmailVerification(user);
        const agentCode = generateAgentCode();
        const referralCode = generateReferralCode();
        const newAgent: Omit<Agent, 'id'> = {
            name, email, role: 'agent', status: 'active', circle, agent_code: agentCode,
            referralCode: referralCode, createdAt: Timestamp.now(), lastSeen: Timestamp.now(),
            isProfileComplete: false, hasCompletedInduction: true, commissionBalance: 0, referralEarnings: 0,
        };
        await setDoc(doc(db, 'users', user.uid), newAgent);
    },
    memberSignup: async (memberData: NewPublicMemberData, password: string): Promise<void> => {
        const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
        const { user } = userCredential;
        await sendEmailVerification(user);
        
        let referredByAdmin = false;
        let referrerId: string | null = null;

        if (memberData.referralCode) {
            const q = query(usersCollection, where('referralCode', '==', memberData.referralCode), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const referrerDoc = snapshot.docs[0];
                const referrer = referrerDoc.data() as User;
                referrerId = referrerDoc.id;
                if (referrer.role === 'admin') {
                    referredByAdmin = true;
                }
            }
        }

        const welcomeMessage = await generateWelcomeMessage(memberData.full_name, memberData.circle);

        const batch = writeBatch(db);
        const memberRef = doc(membersCollection);
        const newMemberDoc: Omit<Member, 'id'> = {
            ...memberData, uid: user.uid, agent_id: 'PUBLIC_SIGNUP', agent_name: 'Self-Registered',
            date_registered: new Date().toISOString(), payment_status: 'pending_verification', registration_amount: 10,
            welcome_message: welcomeMessage, membership_card_id: `UGC-M-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        };
        batch.set(memberRef, newMemberDoc);
        
        const referralCode = generateReferralCode();
        const userRef = doc(db, 'users', user.uid);
        // FIX: Corrected property name 'national_id' to 'id_card_number' to match the User/MemberUser type.
        const newUserDoc: Omit<MemberUser, 'id'> = {
            name: memberData.full_name, email: memberData.email, phone: memberData.phone, address: memberData.address,
            id_card_number: memberData.national_id, role: 'member', status: 'pending', circle: memberData.circle,
            createdAt: Timestamp.now(), lastSeen: Timestamp.now(), isProfileComplete: false, member_id: memberRef.id,
            credibility_score: 100, distress_calls_available: 1, referralCode, referredBy: memberData.referralCode || '',
            referrerId: referrerId || undefined,
            hasCompletedInduction: referredByAdmin,
        };
        batch.set(userRef, newUserDoc);
        
        await batch.commit();

        if (referredByAdmin) {
            await addDoc(payoutsCollection, {
                userId: user.uid,
                userName: memberData.full_name,
                type: 'admin_referral_bonus',
                amount: 5,
                status: 'pending',
                requestedAt: serverTimestamp(),
                ecocashName: '',
                ecocashNumber: '',
            });
        }
    },
    activateMemberAccount: async (member: Member, password: string): Promise<void> => {
         if (!member.email) throw new Error("Member email is missing.");
         const userCredential = await createUserWithEmailAndPassword(auth, member.email, password);
         const { user } = userCredential;
         await sendEmailVerification(user);
         
         const referralCode = generateReferralCode();
         const newUser: Omit<MemberUser, 'id'> = {
            name: member.full_name, email: member.email, phone: member.phone, role: 'member',
            status: 'active', circle: member.circle, createdAt: Timestamp.now(), lastSeen: Timestamp.now(),
            isProfileComplete: false, member_id: member.id, credibility_score: 100, distress_calls_available: 1, referralCode,
            hasCompletedInduction: false,
         };

         const batch = writeBatch(db);
         batch.set(doc(db, 'users', user.uid), newUser);
         batch.update(doc(db, 'members', member.id), { uid: user.uid });
         await batch.commit();
    },
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
    updateUser: (uid: string, data: Partial<User>) => updateDoc(doc(db, 'users', uid), data),
    getPublicUserProfile: async (uid: string): Promise<PublicUserProfile | null> => {
        const userDoc = await getDoc(doc(usersCollection, uid));
        if (!userDoc.exists()) return null;
        const d = userDoc.data();
        return {
            id: userDoc.id, name: d.name, email: d.email, role: d.role, circle: d.circle, status: d.status, bio: d.bio, profession: d.profession,
            skills: d.skills, interests: d.interests, businessIdea: d.businessIdea, isLookingForPartners: d.isLookingForPartners,
            lookingFor: d.lookingFor, credibility_score: d.credibility_score, scap: d.scap, ccap: d.ccap, createdAt: d.createdAt,
            pitchDeckTitle: d.pitchDeckTitle, pitchDeckSlides: d.pitchDeckSlides,
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
            snapshot.docs.forEach(doc => {
                 profiles.push({ id: doc.id, ...doc.data() } as PublicUserProfile);
            });
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
        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() } as User);
            });
        });
        return users;
    },
    searchUsers: async (searchQuery: string, currentUser: User): Promise<PublicUserProfile[]> => {
        if (!searchQuery.trim()) return [];
        
        const lowerCaseQuery = searchQuery.toLowerCase();
        const q = query(
            usersCollection,
            where('name', '>=', lowerCaseQuery),
            where('name', '<=', lowerCaseQuery + '\uf8ff'),
            limit(20)
        );

        try {
            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile));
            return users.filter(u => u.id !== currentUser.id);
        } catch (error) {
            console.error("Error searching users:", error);
            // This error likely means a composite index is needed.
            if ((error as any).code === 'failed-precondition') {
                throw new Error("User search is not configured. Please contact an admin to enable it.");
            }
            throw new Error("Could not perform search at this time.");
        }
    },
    getChatContacts: async (currentUser: User): Promise<User[]> => {
        const q = query(usersCollection, where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
        // Filter out the current user from the list of contacts
        return users.filter(u => u.id !== currentUser.id);
    },
    getSearchableUsers: async (currentUser: User): Promise<PublicUserProfile[]> => {
        const q = query(usersCollection, where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
        return users.filter(u => u.id !== currentUser.id);
    },
    getUserByReferralCode: async (referralCode: string): Promise<User | null> => {
        const q = query(usersCollection, where('referralCode', '==', referralCode), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as User;
    },

    // Admin
    listenForAllUsers: (adminUser: User, callback: (users: User[]) => void, onError: (error: Error) => void) => onSnapshot(query(usersCollection, orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), onError),
    listenForAllMembers: (adminUser: User, callback: (members: Member[]) => void, onError: (error: Error) => void) => onSnapshot(query(membersCollection, orderBy('date_registered', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), onError),
    listenForAllAgents: (adminUser: User, callback: (agents: Agent[]) => void, onError: (error: Error) => void) => onSnapshot(query(usersCollection, where('role', 'in', ['agent', 'creator'])), s => {
        const agents = s.docs.map(d => ({ id: d.id, ...d.data() } as Agent));
        // Sort client-side to avoid needing a composite index which can cause permission errors
        agents.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        callback(agents);
    }, onError),
    listenForPendingMembers: (adminUser: User, callback: (members: Member[]) => void, onError: (error: Error) => void) => onSnapshot(query(membersCollection, where('payment_status', '==', 'pending_verification'), orderBy('date_registered', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), onError),
    updateUserRole: (adminUser: User, userId: string, newRole: User['role']) => updateDoc(doc(db, 'users', userId), { role: newRole }),

    // Agent
    getAgentMembers: async (agent: Agent): Promise<Member[]> => {
        const q = query(membersCollection, where('agent_id', '==', agent.id));
        const snapshot = await getDocs(q);
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
        // Sort client-side to avoid needing a composite index
        members.sort((a, b) => new Date(b.date_registered).getTime() - new Date(a.date_registered).getTime());
        return members;
    },
    registerMember: async (agent: Agent, memberData: NewMember): Promise<Member> => {
        const welcomeMessage = await generateWelcomeMessage(memberData.full_name, memberData.circle);
        const newMember: Omit<Member, 'id'> = {
            ...memberData, agent_id: agent.id, agent_name: agent.name, date_registered: new Date().toISOString(),
            welcome_message: welcomeMessage, membership_card_id: `UGC-M-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        };
        const docRef = await addDoc(membersCollection, newMember);
        return { id: docRef.id, ...newMember };
    },
    processPendingWelcomeMessages: async () => 0, // Simplified

    // Member
    getMemberByEmail: async (email: string): Promise<Member | null> => {
        const q = query(membersCollection, where('email', '==', email), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const d = snapshot.docs[0];
        return { id: d.id, ...d.data() } as Member;
    },
    updateMemberProfile: (memberId: string, data: Partial<Member>) => updateDoc(doc(db, 'members', memberId), data),
    listenForReferredUsers: (userId: string, callback: (users: PublicUserProfile[]) => void, onError: (error: Error) => void) => {
        return onSnapshot(doc(usersCollection, userId), async (userSnap) => {
            try {
                if (!userSnap.exists()) {
                    callback([]);
                    return;
                }
                const referralCode = userSnap.data().referralCode;
                if (!referralCode) {
                    callback([]);
                    return;
                }
                const q = query(usersCollection, where('referredBy', '==', referralCode), orderBy('createdAt', 'desc'));
                const referredSnapshot = await getDocs(q);
                callback(referredSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as PublicUserProfile));
            } catch (error) {
                onError(error as Error);
            }
        }, onError);
    },
    approveMember: async (admin: User, member: Member) => {
        const batch = writeBatch(db);
        batch.update(doc(membersCollection, member.id), { payment_status: 'complete' });
        if (member.uid) batch.update(doc(usersCollection, member.uid), { status: 'active' });
        await batch.commit();
    },
    rejectMember: (admin: User, member: Member) => updateDoc(doc(membersCollection, member.id), { payment_status: 'rejected' }),
    updatePaymentStatus: (admin: User, memberId: string, status: Member['payment_status']) => updateDoc(doc(membersCollection, memberId), { payment_status: status }),
    resetDistressQuota: (admin: User, userId: string) => updateDoc(doc(usersCollection, userId), { distress_calls_available: 1 }),
    clearLastDistressPost: (admin: User, userId: string) => updateDoc(doc(usersCollection, userId), { last_distress_call: null }),

    // Broadcasts
    getBroadcasts: async (): Promise<Broadcast[]> => {
        const q = query(broadcastsCollection, orderBy('date', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast));
    },
    sendBroadcast: async (user: User, message: string): Promise<Broadcast> => {
        const newBroadcast: Omit<Broadcast, 'id'> = {
            authorId: user.id, authorName: user.name, message, date: new Date().toISOString()
        };
        const docRef = await addDoc(broadcastsCollection, newBroadcast);
        return { id: docRef.id, ...newBroadcast };
    },

    // Posts
    createPost: (user: User, content: string, type: Post['types'], ccapToAward: number) => {
        const transaction = runTransaction(db, async (t) => {
            const postRef = doc(collection(db, 'posts'));
            const userRef = doc(db, 'users', user.id);

            const newPost: Omit<Post, 'id'> = {
                authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role,
                content, date: new Date().toISOString(), upvotes: [], types: type,
            };
            t.set(postRef, newPost);
            if (ccapToAward > 0) t.update(userRef, { ccap: increment(ccapToAward) });
        });
        return transaction;
    },
    repostPost: async (originalPost: Post, user: User, comment: string) => {
        const batch = writeBatch(db);
        const newPostRef = doc(postsCollection);
        const originalPostRef = doc(postsCollection, originalPost.id);

        const repost: Omit<Post, 'id'> = {
            authorId: user.id, authorName: user.name, authorCircle: user.circle, authorRole: user.role,
            content: comment, date: new Date().toISOString(), upvotes: [], types: 'general',
            repostedFrom: {
                authorId: originalPost.authorId, authorName: originalPost.authorName,
                authorCircle: originalPost.authorCircle, content: originalPost.content, date: originalPost.date,
            }
        };
        batch.set(newPostRef, repost);
        batch.update(originalPostRef, { repostCount: increment(1) });
        await batch.commit();
    },
    sendDistressPost: async (user: MemberUser, content: string) => {
        if (user.distress_calls_available <= 0) throw new Error("No distress calls available.");
        const batch = writeBatch(db);
        const postRef = doc(postsCollection);
        const userRef = doc(usersCollection, user.id);
        const newPost: Omit<Post, 'id'> = {
            authorId: user.id, authorName: `Anonymous Member`, authorCircle: user.circle, authorRole: user.role,
            content, date: new Date().toISOString(), upvotes: [], types: 'distress',
        };
        batch.set(postRef, newPost);
        batch.update(userRef, { distress_calls_available: increment(-1), last_distress_call: serverTimestamp() });
        await batch.commit();
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
            if (upvotes.includes(userId)) {
                await updateDoc(postRef, { upvotes: arrayRemove(userId) });
            } else {
                await updateDoc(postRef, { upvotes: arrayUnion(userId) });
            }
        }
    },
    fetchPinnedPosts: async (isAdmin: boolean): Promise<Post[]> => {
        const publicTypes = ['general', 'proposal', 'offer', 'opportunity'];
        let typesToQuery = publicTypes;
        
        const queries = [query(postsCollection, where('isPinned', '==', true), where('types', 'in', typesToQuery))];
        
        if (isAdmin) {
             queries.push(query(postsCollection, where('isPinned', '==', true), where('types', '==', 'distress')));
        }
        
        const allResults = await Promise.all(queries.map(q => getDocs(q)));
        const allPosts = allResults.flatMap(snapshot => snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        
        return allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    fetchRegularPosts: async (count: number, filter: string, isAdmin: boolean, start?: DocumentSnapshot<DocumentData>) => {
        const publicTypes = ['general', 'proposal', 'offer', 'opportunity'];
        
        let finalQuery;

        if (filter === 'all') {
            const typesToQuery = isAdmin ? [...publicTypes, 'distress'] : publicTypes;
            const constraints: any[] = [ where('types', 'in', typesToQuery), orderBy('date', 'desc'), limit(count) ];
            if (start) { constraints.push(startAfter(start)); }
            finalQuery = query(postsCollection, ...constraints);
        } else {
             const constraints: any[] = [ where('types', '==', filter), orderBy('date', 'desc'), limit(count) ];
             if (start) { constraints.push(startAfter(start)); }
             finalQuery = query(postsCollection, ...constraints);
        }
        
        const snapshot = await getDocs(finalQuery);
        const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
        return { posts, lastVisible };
    },
    listenForPostsByAuthor: (authorId: string, callback: (posts: Post[]) => void, onError: (error: Error) => void) => {
        const publicTypes = ['general', 'proposal', 'offer', 'opportunity'];
        const q = query(postsCollection, where('authorId', '==', authorId), where('types', 'in', publicTypes), orderBy('date', 'desc'));
        return onSnapshot(q, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), onError);
    },
    togglePinPost: (admin: User, postId: string, pin: boolean) => updateDoc(doc(postsCollection, postId), { isPinned: pin }),

    // Comments
    listenForComments: (parentId: string, callback: (comments: Comment[]) => void, parentCollection: 'posts' | 'proposals', onError: (error: Error) => void) => 
        onSnapshot(
            query(collection(db, parentCollection, parentId, 'comments'), orderBy('timestamp', 'asc')), 
            (snapshot) => {
                callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
            },
            onError
        ),
    addComment: (parentId: string, commentData: Omit<Comment, 'id' | 'timestamp'>, parentCollection: 'posts' | 'proposals') => {
        const batch = writeBatch(db);
        const commentRef = doc(collection(db, parentCollection, parentId, 'comments'));
        const parentRef = doc(db, parentCollection, parentId);
        batch.set(commentRef, { ...commentData, timestamp: serverTimestamp() });
        batch.update(parentRef, { commentCount: increment(1) });
        return batch.commit();
    },
    deleteComment: (parentId: string, commentId: string, parentCollection: 'posts' | 'proposals') => {
        const batch = writeBatch(db);
        batch.delete(doc(db, parentCollection, parentId, 'comments', commentId));
        // The line to update commentCount was removed to prevent permission errors when a user
        // deletes their comment on another user's post. The count may become out of sync,
        // but this ensures the delete functionality works.
        return batch.commit();
    },
    upvoteComment: async (parentId: string, commentId: string, userId: string, parentCollection: 'posts' | 'proposals') => {
        const ref = doc(db, parentCollection, parentId, 'comments', commentId);
        const docSnap = await getDoc(ref);
        if (docSnap.exists() && (docSnap.data().upvotes || []).includes(userId)) {
            await updateDoc(ref, { upvotes: arrayRemove(userId) });
        } else {
            await updateDoc(ref, { upvotes: arrayUnion(userId) });
        }
    },

    // Reports
    reportPost: (reporter: User, post: Post, reason: string, details: string) => {
        const report: Omit<Report, 'id'> = {
            reporterId: reporter.id, reporterName: reporter.name, reportedUserId: post.authorId,
            reportedUserName: post.authorName, postId: post.id, postContent: post.content, postAuthorId: post.authorId,
            reason, details, date: new Date().toISOString(), status: 'new',
        };
        return addDoc(reportsCollection, report);
    },
    reportUser: (reporter: User, reportedUser: PublicUserProfile, reason: string, details: string) => {
        const report: Omit<Report, 'id'> = {
            reporterId: reporter.id, reporterName: reporter.name, reportedUserId: reportedUser.id,
            reportedUserName: reportedUser.name, reason, details, date: new Date().toISOString(), status: 'new',
        };
        return addDoc(reportsCollection, report);
    },
    listenForReports: (admin: User, callback: (reports: Report[]) => void, onError: (error: Error) => void) => onSnapshot(query(reportsCollection, orderBy('date', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))), onError),
    resolvePostReport: async (admin: User, reportId: string, postId: string, authorId: string) => {
        const batch = writeBatch(db);
        batch.update(doc(reportsCollection, reportId), { status: 'resolved' });
        batch.delete(doc(postsCollection, postId));
        batch.update(doc(usersCollection, authorId), { credibility_score: increment(-25) });
        await batch.commit();
    },
    dismissReport: (admin: User, reportId: string) => updateDoc(doc(reportsCollection, reportId), { status: 'resolved' }),
    
    // Connect/Chat
    listenForConversations: (user: User, callback: (convos: Conversation[]) => void, onError: (error: Error) => void) => 
        onSnapshot(
            query(conversationsCollection, where('members', 'array-contains', user.id)), 
            (snapshot) => {
                const conversations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
                // Sort client-side to avoid index requirement
                conversations.sort((a, b) => {
                    const timeA = a.lastMessageTimestamp?.toMillis() || 0;
                    const timeB = b.lastMessageTimestamp?.toMillis() || 0;
                    return timeB - timeA;
                });
                callback(conversations);
            },
            onError
        ),
    startChat: async (currentUser: User, targetUser: PublicUserProfile): Promise<Conversation> => {
        const currentUserId = currentUser.id;
        const targetUserId = targetUser.id;
        const currentUserName = currentUser.name;
        const targetUserName = targetUser.name;

        const q = query(
            conversationsCollection,
            where('members', 'array-contains', currentUserId)
        );
    
        const querySnapshot = await getDocs(q);
        
        const existingConvoDoc = querySnapshot.docs.find(doc => {
            const data = doc.data();
            return data.isGroup === false && data.members.includes(targetUserId);
        });
    
        if (existingConvoDoc) {
            return { id: existingConvoDoc.id, ...existingConvoDoc.data() } as Conversation;
        }
    
        const convoId = [currentUserId, targetUserId].sort().join('_');
        const convoRef = doc(conversationsCollection, convoId);
        
        const newConvoData: Omit<Conversation, 'id'> = {
            members: [currentUserId, targetUserId],
            memberNames: { [currentUserId]: currentUserName, [targetUserId]: targetUserName },
            lastMessage: "Conversation started", 
            lastMessageTimestamp: Timestamp.now(),
            lastMessageSenderId: currentUserId, 
            readBy: [currentUserId], 
            isGroup: false
        };
    
        await setDoc(convoRef, newConvoData);

        const batch = writeBatch(db);
        const targetUserRef = doc(usersCollection, targetUserId);
        const currentUserRef = doc(usersCollection, currentUserId);
        batch.update(targetUserRef, { conversationIds: arrayUnion(convoId) });
        batch.update(currentUserRef, { conversationIds: arrayUnion(convoId) });

        const notificationPayload = {
          userId: targetUserId,
          message: `You have a new chat from ${currentUserName}`,
          link: convoId,
          read: false,
          timestamp: serverTimestamp(),
          type: 'NEW_CHAT',
          causerId: currentUserId,
        };
        const notifRef = doc(collection(db, 'users', targetUserId, 'notifications'));
        batch.set(notifRef, notificationPayload);

        await batch.commit();
        
        return { id: convoId, ...newConvoData };
    },
    createGroupChat: async (name: string, members: (User | PublicUserProfile)[], currentUser: User) => {
        const memberIds = members.map(m => m.id);
        const memberNames = members.reduce((acc, m) => ({...acc, [m.id]: m.name}), {} as {[key: string]: string});

        const newGroup: Omit<Conversation, 'id'> = {
            name, members: memberIds, memberNames, lastMessage: `${currentUser.name} created the group.`, lastMessageTimestamp: Timestamp.now(),
            lastMessageSenderId: currentUser.id, readBy: [currentUser.id], isGroup: true
        };
        const groupRef = await addDoc(conversationsCollection, newGroup);

        const batch = writeBatch(db);
        memberIds.forEach(id => {
          const userRef = doc(usersCollection, id);
          batch.update(userRef, { conversationIds: arrayUnion(groupRef.id) });
        });

        memberIds.filter(id => id !== currentUser.id).forEach(async (id) => {
            const notificationPayload = {
              userId: id,
              message: `${currentUser.name} added you to a new group: ${name}`,
              link: groupRef.id,
              read: false,
              timestamp: serverTimestamp(),
              type: 'NEW_CHAT',
              causerId: currentUser.id,
            };
            const notifRef = doc(collection(db, 'users', id, 'notifications'));
            batch.set(notifRef, notificationPayload);
        });
        
        await batch.commit();
    },
    listenForMessages: (convoId: string, callback: (messages: Message[]) => void) => onSnapshot(query(collection(db, 'conversations', convoId, 'messages'), orderBy('timestamp', 'asc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Message)))),
    sendMessage: async (convoId: string, message: Omit<Message, 'id' | 'timestamp'>, convo: Conversation) => {
        const batch = writeBatch(db);
        const messageRef = doc(collection(db, 'conversations', convoId, 'messages'));
        const convoRef = doc(conversationsCollection, convoId);
        batch.set(messageRef, { ...message, timestamp: serverTimestamp() });
        batch.update(convoRef, {
            lastMessage: message.text, lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: message.senderId, readBy: [message.senderId]
        });
        await batch.commit();
    },
    getGroupMembers: async (memberIds: string[]): Promise<MemberUser[]> => {
        if (memberIds.length === 0) return [];
        const q = query(usersCollection, where('__name__', 'in', memberIds));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d => ({ id: d.id, ...d.data()}) as MemberUser));
    },
    updateGroupMembers: (convoId: string, newMemberIds: string[], newMemberNames: {[key: string]: string}) => updateDoc(doc(conversationsCollection, convoId), { members: newMemberIds, memberNames: newMemberNames }),
    leaveGroup: (convoId: string, userId: string) => updateDoc(doc(conversationsCollection, convoId), { members: arrayRemove(userId) }),

    // Notifications & Activity
    listenForNotifications: (userId: string, callback: (notifs: Notification[]) => void, onError: (error: Error) => void) => 
        onSnapshot(
            query(collection(db, 'users', userId, 'notifications'), limit(50)), 
            (s) => {
                const notifications = s.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
                // Sort client-side to avoid index requirement which can throw permission errors
                notifications.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                callback(notifications);
            }, 
            onError
        ),
    listenForActivity: (circle: string, callback: (acts: Activity[]) => void, onError: (error: Error) => void) => 
        onSnapshot(
            query(activityCollection, where('causerCircle', '==', circle), limit(50)), 
            (snapshot) => {
                const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
                activities.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                callback(activities.slice(0, 10));
            },
            onError
        ),
    listenForRecentActivity: (count: number, callback: (acts: Activity[]) => void, onError: (error: Error) => void) => onSnapshot(query(activityCollection, orderBy('timestamp', 'desc'), limit(count)), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), onError),
    listenForAllNewMemberActivity: (callback: (acts: Activity[]) => void, onError: (error: Error) => void) => onSnapshot(query(activityCollection, where('type', '==', 'NEW_MEMBER'), orderBy('timestamp', 'desc'), limit(10)), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), onError),
    markNotificationAsRead: (notificationId: string) => updateDoc(doc(db, 'users', auth.currentUser!.uid, 'notifications', notificationId), { read: true }),
    markAllNotificationsAsRead: async (userId: string) => {
        const q = query(collection(db, 'users', userId, 'notifications'), where('read', '==', false));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },

    // Proposals
    listenForProposals: (callback: (proposals: Proposal[]) => void, onError: (error: Error) => void) => onSnapshot(query(proposalsCollection, orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), onError),
    getProposal: async (id: string): Promise<Proposal | null> => {
        const docSnap = await getDoc(doc(proposalsCollection, id));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Proposal : null;
    },
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
    
    // Economy
    getCurrentRedemptionCycle: async (): Promise<RedemptionCycle | null> => {
        const q = query(redemptionCyclesCollection, orderBy('endDate', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const d = snapshot.docs[0];
        return {id: d.id, ...d.data()} as RedemptionCycle;
    },
    listenForUserPayouts: (userId: string, callback: (payouts: PayoutRequest[]) => void, onError: (error: Error) => void) => {
        const q = query(payoutsCollection, where('userId', '==', userId));
        return onSnapshot(q, (snapshot) => {
            const payouts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest));
            // Sort client-side to avoid needing a composite index
            payouts.sort((a, b) => {
                const timeA = a.requestedAt?.toMillis() || 0;
                const timeB = b.requestedAt?.toMillis() || 0;
                return timeB - timeA;
            });
            callback(payouts);
        }, onError);
    },
    requestPayout: (user: User, ecocashName: string, ecocashNumber: string, amount: number) => addDoc(payoutsCollection, {
        userId: user.id, userName: user.name, type: 'referral', amount, ecocashName, ecocashNumber,
        status: 'pending', requestedAt: serverTimestamp(),
    }),
    claimBonusPayout: (payoutId: string, ecocashName: string, ecocashNumber: string) => updateDoc(doc(payoutsCollection, payoutId), {
        ecocashName, ecocashNumber
    }),
    requestCommissionPayout: (user: User, ecocashName: string, ecocashNumber: string, amount: number) => {
        return runTransaction(db, async (t) => {
            const userRef = doc(usersCollection, user.id);
            const payoutRef = doc(collection(db, 'payouts'));
            
            t.set(payoutRef, {
                userId: user.id, userName: user.name, type: 'commission', amount, ecocashName, ecocashNumber,
                status: 'pending', requestedAt: serverTimestamp(),
            });
            t.update(userRef, { commissionBalance: 0 });
        });
    },
    listenForPayoutRequests: (admin: User, callback: (reqs: PayoutRequest[]) => void, onError: (error: Error) => void) => onSnapshot(query(payoutsCollection, orderBy('requestedAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), onError),
    updatePayoutStatus: (payoutId: string, status: 'completed' | 'rejected') => updateDoc(doc(payoutsCollection, payoutId), { status }),
    redeemCcapForCash: (user: User, ecocashName: string, ecocashNumber: string, usdtValue: number, ccapToRedeem: number, ccap_to_usd_rate: number) => addDoc(payoutsCollection, {
        userId: user.id, userName: user.name, type: 'ccap_redemption', amount: usdtValue, ecocashName, ecocashNumber,
        status: 'pending', requestedAt: serverTimestamp(), meta: { ccapToRedeem, ccapUsdValue: usdtValue, ccapRate: ccap_to_usd_rate },
    }),
    stakeCcapForNextCycle: (user: MemberUser) => { /* Logic to be implemented */ return Promise.resolve() },
    convertCcapToVeq: async (user: MemberUser, venture: Venture, ccapAmount: number, ccapRate: number) => {
        const usdValue = ccapAmount * ccapRate;
        const shares = Math.floor(usdValue); // Simplified 1 USD = 1 share

        return runTransaction(db, async t => {
            const userRef = doc(usersCollection, user.id);
            const ventureRef = doc(venturesCollection, venture.id);
            const userDoc = await t.get(userRef);

            const existingHoldings: VentureEquityHolding[] = userDoc.data()?.ventureEquity || [];
            const existingHolding = existingHoldings.find(h => h.ventureId === venture.id);

            let newHoldings: VentureEquityHolding[];
            if (existingHolding) {
                newHoldings = existingHoldings.map(h => h.ventureId === venture.id ? { ...h, shares: h.shares + shares } : h);
            } else {
                newHoldings = [...existingHoldings, { ventureId: venture.id, ventureName: venture.name, ventureTicker: venture.ticker, shares }];
            }

            t.update(userRef, { currentCycleCcap: 0, lastCycleChoice: 'invested', ventureEquity: newHoldings });
            t.update(ventureRef, { fundingRaisedCcap: increment(ccapAmount), backers: arrayUnion(user.id), totalSharesIssued: increment(shares) });
        });
    },

    // Sustenance
    getSustenanceFund: async (): Promise<SustenanceCycle | null> => {
        const docSnap = await getDoc(doc(sustenanceCollection, 'current'));
        return docSnap.exists() ? docSnap.data() as SustenanceCycle : null;
    },
    getAllSustenanceVouchers: async (): Promise<SustenanceVoucher[]> => {
        const snapshot = await getDocs(query(vouchersCollection, orderBy('issuedAt', 'desc'), limit(100)));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher));
    },
    initializeSustenanceFund: (admin: User, balance: number, cost: number) => setDoc(doc(sustenanceCollection, 'current'), {
        slf_balance: balance, hamper_cost: cost, last_run: serverTimestamp(), next_run: serverTimestamp(),
    }),
    runSustenanceLottery: (admin: User): Promise<{ winners_count: number }> => { return Promise.resolve({ winners_count: 0 }); /* Complex logic here */ },
    performDailyCheckin: (userId: string): Promise<Partial<User>> => {
      // Return the fields that will be updated for optimistic UI
      return updateDoc(doc(usersCollection, userId), { 
        scap: increment(10), 
        lastDailyCheckin: serverTimestamp() 
      }).then(() => ({
        scap: increment(10), // This is not the real value, but tells the client what to expect
        lastDailyCheckin: Timestamp.now()
      }));
    },
    submitPriceVerification: (userId: string, item: string, price: number, shop: string) => {
        const batch = writeBatch(db);
        batch.update(doc(usersCollection, userId), { ccap: increment(15) });
        batch.set(doc(collection(db, 'price_verifications')), { userId, item, price, shop, date: serverTimestamp() });
        return batch.commit();
    },
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

    // Ventures
    getCollaborators: async (count: number): Promise<{ users: User[] }> => {
        const q = query(usersCollection, where('role', '==', 'member'), where('isLookingForPartners', '==', true), limit(count));
        const snapshot = await getDocs(q);
        return { users: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)) };
    },
    getFundraisingVentures: async (): Promise<Venture[]> => {
        const q = query(venturesCollection, where('status', '==', 'fundraising'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Venture));
    },
    listenForFundraisingVentures: (callback: (ventures: Venture[]) => void, onError: (e: Error) => void) => onSnapshot(
        query(venturesCollection, where('status', '==', 'fundraising'), orderBy('createdAt', 'desc')),
        s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))),
        onError
    ),
    listenForUserVentures: (userId: string, callback: (ventures: Venture[]) => void, onError: (e: Error) => void) => onSnapshot(
        query(venturesCollection, where('ownerId', '==', userId)),
        s => {
            const ventures = s.docs.map(d => ({ id: d.id, ...d.data() } as Venture));
            ventures.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            callback(ventures);
        },
        onError
    ),
    createVenture: async (ventureData: Omit<Venture, 'id' | 'createdAt' | 'fundingRaisedCcap' | 'backers' | 'status' | 'totalSharesIssued' | 'totalProfitsDistributed' | 'ticker'>) => {
        const newVenture: Omit<Venture, 'id'> = {
            ...ventureData,
            status: 'fundraising',
            createdAt: Timestamp.now(),
            fundingRaisedCcap: 0,
            backers: [],
            ticker: ventureData.name.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 100),
            totalSharesIssued: 0,
            totalProfitsDistributed: 0,
        };
        await addDoc(venturesCollection, newVenture);
    },
    deleteVenture: async (user: User, ventureId: string) => {
        const ventureRef = doc(venturesCollection, ventureId);
        const ventureDoc = await getDoc(ventureRef);
        if (!ventureDoc.exists()) {
            throw new Error("Venture not found.");
        }
        const venture = ventureDoc.data() as Venture;
        if (venture.ownerId !== user.id) {
            throw new Error("You are not authorized to delete this venture.");
        }
        if (venture.backers && venture.backers.length > 0) {
            throw new Error("Cannot delete a venture that has already received investment.");
        }
        await deleteDoc(ventureRef);
    },
    listenForVentures: (admin: User, callback: (ventures: Venture[]) => void, onError: (e: Error) => void) => onSnapshot(query(venturesCollection, orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), onError),
    getVentureById: async (id: string): Promise<Venture | null> => {
        const docSnap = await getDoc(doc(venturesCollection, id));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Venture : null;
    },
    getDistributionsForUserInVenture: async (userId: string, ventureId: string, userShares: number, totalShares: number): Promise<Distribution[]> => {
        const snapshot = await getDocs(query(collection(db, 'ventures', ventureId, 'distributions'), orderBy('date', 'desc')));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Distribution));
    },
    requestVeqPayout: (user: User, holding: VentureEquityHolding, shares: number, ecocashName: string, ecocashNumber: string) => addDoc(payoutsCollection, {
        userId: user.id, userName: user.name, type: 'veq_redemption', amount: shares, ecocashName, ecocashNumber,
        status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: holding.ventureId, ventureName: holding.ventureName }
    }),
    
    // Knowledge
    awardKnowledgePoints: async (userId: string): Promise<boolean> => {
        const userRef = doc(usersCollection, userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && !userDoc.data().hasReadKnowledgeBase) {
            await updateDoc(userRef, { hasReadKnowledgeBase: true, knowledgePoints: increment(10) });
            return true;
        }
        return false;
    },

    // Creator Content
    createCreatorContent: (user: User, title: string, content: string) => addDoc(collection(db, 'creator_content'), {
        creatorId: user.id,
        creatorName: user.name,
        title,
        content,
        createdAt: serverTimestamp(),
    }),
    listenForCreatorContent: (creatorId: string, callback: (content: CreatorContent[]) => void, onError: (e: Error) => void) => onSnapshot(
        query(collection(db, 'creator_content'), where('creatorId', '==', creatorId), orderBy('createdAt', 'desc')),
        s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as CreatorContent))),
        onError
    ),
    deleteCreatorContent: (contentId: string) => deleteDoc(doc(db, 'creator_content', contentId)),
    listenForContentFromReferrer: (referrerId: string, callback: (content: CreatorContent[]) => void, onError: (e: Error) => void) => {
        const q = query(collection(db, 'creator_content'), where('creatorId', '==', referrerId), orderBy('createdAt', 'desc'));
        return onSnapshot(q, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as CreatorContent))), onError);
    },
    
    // Globals / CVP
    getCommunityValuePool: async (): Promise<CommunityValuePool> => {
        const docSnap = await getDoc(doc(globalsCollection, 'cvp'));
        if (!docSnap.exists()) {
            return { id: 'singleton', total_usd_value: 0, total_circulating_ccap: 0, ccap_to_usd_rate: 0.01 };
        }
        return docSnap.data() as CommunityValuePool;
    },
    listenForCVP: (admin: User, callback: (cvp: CommunityValuePool | null) => void, onError: (e: Error) => void) => onSnapshot(doc(globalsCollection, 'cvp'), s => callback(s.exists() ? s.data() as CommunityValuePool : null), onError),
    addFundsToCVP: (admin: User, amount: number) => runTransaction(db, async t => {
        const cvpRef = doc(globalsCollection, 'cvp');
        const cvpDoc = await t.get(cvpRef);
        const newTotal = (cvpDoc.data()?.total_usd_value || 0) + amount;
        t.set(cvpRef, { total_usd_value: newTotal }, { merge: true });
    }),
};
