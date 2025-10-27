import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
  sendEmailVerification,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  deleteDoc,
  writeBatch,
  increment,
  serverTimestamp as firestoreServerTimestamp,
  startAfter,
  DocumentSnapshot,
  DocumentData,
  runTransaction,
} from 'firebase/firestore';
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { auth, db, rtdb } from './firebase';
import { 
    User, Agent, Member, NewMember, Broadcast, Post, NewPublicMemberData, MemberUser, 
    Conversation, Message, Report, UserReport, Notification, Activity, Comment, Proposal, PayoutRequest,
    Venture, Distribution, VentureEquityHolding, PublicUserProfile, RedemptionCycle,
    SustenanceVoucher, VendorUser, SustenanceCycle, CommunityValuePool
} from '../types';
import { generateAgentCode, generateReferralCode } from '../utils';
import { generateWelcomeMessage } from './geminiService';


const usersCollection = collection(db, 'users');
const publicProfilesCollection = collection(db, 'publicProfiles');
const membersCollection = collection(db, 'members');
const broadcastsCollection = collection(db, 'broadcasts');
const postsCollection = collection(db, 'posts');
const conversationsCollection = collection(db, 'conversations');
const reportsCollection = collection(db, 'reports');
const userReportsCollection = collection(db, 'user_reports');
const notificationsCollection = collection(db, 'notifications');
const activityFeedCollection = collection(db, 'activity_feed');
const proposalsCollection = collection(db, 'proposals');
const payoutRequestsCollection = collection(db, 'payout_requests');
const venturesCollection = collection(db, 'ventures');
const communityValuePoolCollection = collection(db, 'community_value_pool');
const redemptionCyclesCollection = collection(db, 'redemption_cycles');
const sustenanceVouchersCollection = collection(db, 'sustenance_vouchers');
const sustenanceCyclesCollection = collection(db, 'sustenance_cycles');
const vendorVerificationsCollection = collection(db, 'vendor_verifications');
const PUBLIC_POST_TYPES: Post['types'][] = ['general', 'proposal', 'offer', 'opportunity'];

const getUserProfile = async (uid: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
};

const getPublicUserProfile = async (uid: string): Promise<PublicUserProfile | null> => {
    const profileDocRef = doc(db, 'publicProfiles', uid);
    const profileDoc = await getDoc(profileDocRef);
    if (profileDoc.exists()) {
        return { id: profileDoc.id, ...profileDoc.data() } as PublicUserProfile;
    }
    return null;
};

/**
 * Securely fetches public user profiles from a list of UIDs using batched 'in' queries.
 */
const getPublicUserProfilesByUids = async (uids: string[]): Promise<PublicUserProfile[]> => {
    if (uids.length === 0) return [];
    
    const uidsChunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 30) {
        uidsChunks.push(uids.slice(i, i + 30));
    }

    const profilePromises = uidsChunks.map(chunk => 
        getDocs(query(publicProfilesCollection, where('__name__', 'in', chunk)))
    );

    const profileSnapshots = await Promise.all(profilePromises);
    const profiles = profileSnapshots.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile)));
    
    return profiles;
};


export const api = {
  // Auth
  login: async (email: string, password: string): Promise<User | null> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userProfile = await getUserProfile(userCredential.user.uid);
    if (userProfile?.status === 'ousted') {
        await signOut(auth);
        throw new Error("This account has been suspended.");
    }
    return userProfile;
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  },
  
  signup: async (name: string, email: string, password: string, circle: string): Promise<Agent> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    const newAgent: Agent = {
      id: user.uid,
      name,
      email,
      role: 'agent',
      circle,
      agent_code: generateAgentCode(),
      status: 'active',
      isProfileComplete: false,
      credibility_score: 100,
      referralCode: generateReferralCode(),
      referralEarnings: 0,
      scap: 0,
      ccap: 0,
      currentCycleCcap: 0,
      stakedCcap: 0,
      ventureEquity: [],
      sustenanceTickets: 0,
      sustenanceVouchers: [],
      createdAt: Timestamp.now(),
    };

    const publicProfile: PublicUserProfile = {
        id: user.uid, name, role: 'agent', circle, status: 'active', credibility_score: 100, scap: 0, ccap: 0, createdAt: Timestamp.now(),
    };
    
    const batch = writeBatch(db);
    batch.set(doc(usersCollection, user.uid), newAgent);
    batch.set(doc(publicProfilesCollection, user.uid), publicProfile);
    await batch.commit();

    return newAgent;
  },

  getMemberByEmail: async (email: string): Promise<Member | null> => {
    const q = query(membersCollection, where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Member;
  },

  activateMemberAccount: async (member: Member, password: string): Promise<MemberUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, member.email, password);
    const { user } = userCredential;

    const newUserProfile: MemberUser = {
      id: user.uid,
      name: member.full_name,
      email: member.email,
      role: 'member',
      member_id: member.id,
      distress_calls_available: 2,
      status: 'active',
      isProfileComplete: false,
      circle: member.circle,
      credibility_score: 100,
      phone: member.phone,
      scap: 0,
      ccap: 0,
      currentCycleCcap: 0,
      stakedCcap: 0,
      referralCode: generateReferralCode(),
      referralEarnings: 0,
      ventureEquity: [],
      sustenanceTickets: 0,
      sustenanceVouchers: [],
      createdAt: Timestamp.now(),
    };

    const publicProfile: PublicUserProfile = {
        id: user.uid,
        name: member.full_name,
        role: 'member',
        circle: member.circle,
        status: 'active',
        credibility_score: 100,
        scap: 0,
        ccap: 0,
        createdAt: Timestamp.now(),
    };

    const batch = writeBatch(db);
    batch.set(doc(usersCollection, user.uid), newUserProfile);
    batch.set(doc(publicProfilesCollection, user.uid), publicProfile);
    batch.update(doc(membersCollection, member.id), { uid: user.uid, status: 'active' });
    await batch.commit();

    return newUserProfile;
  },

  memberSignup: async (memberData: NewPublicMemberData, password: string): Promise<MemberUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
    const permanentUser = userCredential.user;
    
    let referrerId: string | undefined = undefined;
    if (memberData.referralCode) {
        const q = query(usersCollection, where("referralCode", "==", memberData.referralCode.toUpperCase()), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            referrerId = querySnapshot.docs[0].id;
        }
    }

    try {
        const newMemberDoc: Omit<Member, 'id'> = {
            full_name: memberData.full_name,
            phone: memberData.phone,
            email: memberData.email,
            circle: memberData.circle,
            address: memberData.address,
            national_id: memberData.national_id,
            registration_amount: 0,
            payment_status: 'pending_verification',
            agent_id: 'PUBLIC_SIGNUP',
            date_registered: new Date().toISOString(),
            membership_card_id: 'PENDING',
            welcome_message: 'Your registration is under review. Welcome to the community!',
            uid: permanentUser.uid,
            ...(referrerId && { referredBy: referrerId }),
        };
        const memberRef = await addDoc(membersCollection, newMemberDoc);
        
        const newUserProfile: MemberUser = {
            id: permanentUser.uid,
            name: memberData.full_name,
            email: memberData.email,
            role: 'member',
            member_id: memberRef.id,
            distress_calls_available: 0,
            status: 'pending',
            isProfileComplete: false,
            circle: memberData.circle,
            credibility_score: 100,
            phone: memberData.phone,
            address: memberData.address,
            id_card_number: memberData.national_id,
            scap: 0,
            ccap: 0,
            currentCycleCcap: 0,
            stakedCcap: 0,
            referralCode: generateReferralCode(),
            referralEarnings: 0,
            ventureEquity: [],
            sustenanceTickets: 0,
            sustenanceVouchers: [],
            createdAt: Timestamp.now(),
            ...(referrerId && { referredBy: referrerId }),
        };
        
        const publicProfile: PublicUserProfile = {
            id: permanentUser.uid,
            name: memberData.full_name,
            role: 'member',
            circle: memberData.circle,
            status: 'pending',
            credibility_score: 100,
            scap: 0,
            ccap: 0,
            createdAt: Timestamp.now(),
        };

        const batch = writeBatch(db);
        batch.set(doc(usersCollection, permanentUser.uid), newUserProfile);
        batch.set(doc(publicProfilesCollection, permanentUser.uid), publicProfile);
        await batch.commit();

        return newUserProfile;
    } catch (dbError) {
        console.error("DB write failed after user creation:", dbError);
        throw new Error("Account created, but failed to save profile. Please contact support.");
    }
  },
   
  sendPasswordReset: (email: string): Promise<void> => {
      return sendPasswordResetEmail(auth, email);
  },

  sendVerificationEmail: async (): Promise<void> => {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
    } else {
      throw new Error("No user is currently signed in to send a verification email.");
    }
  },

  // User/Profile Management
  getUserProfile, // Keep for fetching private user data
  getPublicUserProfile, // New function for public views
  getPublicUserProfilesByUids,

  awardKnowledgePoints: async (userId: string): Promise<boolean> => {
    const userRef = doc(db, 'users', userId);
    let wasAwarded = false;
    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw "User document does not exist!";
        }
        const userData = userDoc.data() as User;
        if (!userData.hasReadKnowledgeBase) {
          transaction.update(userRef, {
            knowledgePoints: increment(10),
            hasReadKnowledgeBase: true,
          });
          wasAwarded = true;
        }
      });
      return wasAwarded;
    } catch (e) {
      console.error("Knowledge points transaction failed: ", e);
      return false;
    }
  },

  getSearchableUsers: async (currentUser: User): Promise<PublicUserProfile[]> => {
    if (currentUser.role === 'agent') {
      return [];
    }
    const q = query(publicProfilesCollection, where('status', 'in', ['active', 'pending']));
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
    return users.filter(user => user.id !== currentUser.id);
  },

  getMemberByUid: async(uid: string): Promise<Member | null> => {
      const q = query(membersCollection, where("uid", "==", uid), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Member;
  },

  updateUser: async (uid: string, updatedData: Partial<User>): Promise<User> => {
      const batch = writeBatch(db);
      
      const userDocRef = doc(db, 'users', uid);
      batch.update(userDocRef, updatedData);

      const publicProfileDocRef = doc(db, 'publicProfiles', uid);
      const publicData: Partial<PublicUserProfile> = {};
      // List of fields to sync to public profile
      const publicFields: (keyof PublicUserProfile)[] = ['name', 'circle', 'bio', 'profession', 'skills', 'interests', 'isLookingForPartners', 'lookingFor', 'businessIdea', 'status'];
      publicFields.forEach(key => {
          if (key in updatedData) {
              (publicData as any)[key] = (updatedData as any)[key];
          }
      });
      if (Object.keys(publicData).length > 0) {
          batch.update(publicProfileDocRef, publicData);
      }
      
      await batch.commit();

      const updatedDoc = await getDoc(userDocRef);
      if (!updatedDoc.exists()) {
        throw new Error("User document not found after update.");
      }
      return { id: updatedDoc.id, ...updatedDoc.data() } as User;
  },

  updateMemberProfile: async(memberId: string, updatedData: Partial<Member>): Promise<void> => {
      const memberDocRef = doc(db, 'members', memberId);
      await updateDoc(memberDocRef, updatedData);
  },

  // Presence
  setupPresence: (uid: string) => {
    const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);
    const userStatusFirestoreRef = doc(db, 'publicProfiles', uid);

    const isOfflineForRTDB = { online: false, lastSeen: rtdbServerTimestamp() };
    const isOnlineForRTDB = { online: true, lastSeen: rtdbServerTimestamp() };
    
    const isOfflineForFirestore = { online: false, lastSeen: firestoreServerTimestamp() };
    const isOnlineForFirestore = { online: true, lastSeen: firestoreServerTimestamp() };

    onDisconnect(userStatusDatabaseRef).set(isOfflineForRTDB).then(() => {
        set(userStatusDatabaseRef, isOnlineForRTDB).catch(err => {
            console.error("RTDB: Could not set online status.", err);
        });
        updateDoc(userStatusFirestoreRef, isOnlineForFirestore).catch((err) => {
            // This might fail if the public profile doesn't exist yet during signup.
            // It's not a critical error, so we'll just warn.
            console.warn("Firestore: Could not set online status, may not have a public profile yet.", err.code);
        });
    }).catch(err => {
        console.error("RTDB: Could not set onDisconnect.", err);
    });
  },

  goOffline: (uid: string) => {
    const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);
    const userStatusFirestoreRef = doc(db, 'publicProfiles', uid);
    set(userStatusDatabaseRef, { online: false, lastSeen: rtdbServerTimestamp() }).catch(err => {
        console.error("RTDB: Could not set offline status.", err);
    });
    updateDoc(userStatusFirestoreRef, { online: false, lastSeen: firestoreServerTimestamp() }).catch(err => {
        console.error("Firestore: Could not set offline status.", err);
    });
  },

  listenForUsersPresence: (uids: string[], callback: (statuses: Record<string, boolean>) => void): (() => void) => {
    const unsubscribers = uids.map(uid => {
      const userStatusRef = ref(rtdb, '/status/' + uid);
      return onValue(userStatusRef, (snapshot) => {
        const status = snapshot.val();
        callback({ [uid]: status?.online || false });
      }, (error) => {
        console.error(`RTDB: Error listening for presence of user ${uid}`, error);
      });
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  },

  // Agent actions
  registerMember: async (agent: Agent, memberData: NewMember): Promise<Member> => {
    if (agent.role !== 'agent') {
        throw new Error("Permission denied: Only agents can register new members.");
    }
    let welcome_message = `Welcome to the Ubuntium Global Commons, ${memberData.full_name}! We are thrilled to have you join the ${agent.circle} Circle. I am because we are.`;
    let needs_welcome_update = false;

    try {
      welcome_message = await generateWelcomeMessage(memberData.full_name, agent.circle);
    } catch (error) {
      console.warn("Could not generate welcome message (likely offline). Using default and flagging for update.", error);
      needs_welcome_update = true;
    }

    const newMember: Omit<Member, 'id'> = {
      ...memberData,
      agent_id: agent.id,
      agent_name: agent.name,
      date_registered: new Date().toISOString(),
      membership_card_id: `UGC-M-${Date.now()}`,
      welcome_message,
      uid: null,
      ...(needs_welcome_update && { needs_welcome_update: true })
    };

    const docRef = await addDoc(membersCollection, newMember);
    return { ...newMember, id: docRef.id };
  },

  getAgentMembers: async (currentUser: User): Promise<Member[]> => {
    if (currentUser.role !== 'agent') {
      throw new Error("Permission denied: only agents can view their members.");
    }
    const q = query(membersCollection, where("agent_id", "==", currentUser.id));
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
    members.sort((a, b) => new Date(b.date_registered).getTime() - new Date(a.date_registered).getTime());
    return members;
  },
  
  // Admin actions
  listenForAllUsers: (currentUser: User, callback: (users: User[]) => void, onError: (error: Error) => void): (() => void) => {
      if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
      }
      const q = query(usersCollection, orderBy('name'));
      return onSnapshot(q,
        (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            callback(users);
        },
        (error) => {
            console.error("Firestore listener error (all users):", error);
            onError(error);
        }
      );
  },
  
  updateUserRole: async (currentUser: User, uid: string, newRole: User['role']): Promise<void> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), { role: newRole });
    batch.update(doc(db, 'publicProfiles', uid), { role: newRole });
    await batch.commit();
  },

  listenForAllMembers: (currentUser: User, callback: (members: Member[]) => void, onError: (error: Error) => void): (() => void) => {
      if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
      }
      const q = query(membersCollection, orderBy('date_registered', 'desc'));
      return onSnapshot(q,
        (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
            
            const emailCounts = members.reduce((acc, member) => {
                acc[member.email] = (acc[member.email] || 0) + 1;
                return acc;
            }, {} as {[key:string]: number});
            
            const membersWithDuplicates = members.map(member => ({ ...member, is_duplicate_email: emailCounts[member.email] > 1 }));
            callback(membersWithDuplicates);
        },
        (error) => {
            console.error("Firestore listener error (all members):", error);
            onError(error);
        }
      );
  },
  
  listenForPendingMembers: (currentUser: User, callback: (members: Member[]) => void, onError: (error: Error) => void): (() => void) => {
      if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
      }
      const q = query(membersCollection, where('payment_status', '==', 'pending_verification'));
      return onSnapshot(q, 
        (snapshot) => {
            const pendingMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
            pendingMembers.sort((a, b) => new Date(a.date_registered).getTime() - new Date(b.date_registered).getTime());
            callback(pendingMembers);
        },
        (error) => {
            console.error("Firestore listener error (pending members):", error);
            onError(error);
        }
      );
  },

  listenForAllAgents: (currentUser: User, callback: (agents: Agent[]) => void, onError: (error: Error) => void): (() => void) => {
      if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
      }
      const q = query(usersCollection, where('role', '==', 'agent'));
      return onSnapshot(q,
        (snapshot) => {
            const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agent));
            agents.sort((a, b) => a.name.localeCompare(b.name));
            callback(agents);
        },
        (error) => {
            console.error("Firestore listener error (all agents):", error);
            onError(error);
        }
      );
  },

  approveMember: async (currentUser: User, member: Member): Promise<void> => {
      if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
      if (!member.uid) throw new Error("Member does not have a user account to approve.");
      
      let welcome_message = `Welcome to the Ubuntium Global Commons, ${member.full_name}! We are thrilled to have you join the ${member.circle} Circle. I am because we are.`;
      let needs_welcome_update = false;

      try {
          welcome_message = await generateWelcomeMessage(member.full_name, member.circle);
      } catch (error) {
          console.warn("Could not generate welcome message during approval (likely offline). Using default and flagging for update.", error);
          needs_welcome_update = true;
      }

      const batch = writeBatch(db);

      const memberRef = doc(db, 'members', member.id);
      const memberUpdatePayload: any = { 
          payment_status: 'complete', 
          welcome_message,
          membership_card_id: `UGC-M-${Date.now()}`
      };
      if (needs_welcome_update) {
          memberUpdatePayload.needs_welcome_update = true;
      }
      batch.update(memberRef, memberUpdatePayload);


      const userRef = doc(db, 'users', member.uid);
      batch.update(userRef, { status: 'active', distress_calls_available: 2 });
      
      const publicProfileRef = doc(db, 'publicProfiles', member.uid);
      batch.update(publicProfileRef, { status: 'active' });

      // Award referral bonus if applicable
      if (member.referredBy) {
          const referrerRef = doc(db, 'users', member.referredBy);
          batch.update(referrerRef, { referralEarnings: increment(1) });
      }
      
      const activity: Omit<Activity, 'id'> = {
          type: 'NEW_MEMBER',
          message: `${member.full_name} from ${member.circle} has joined the commons!`,
          link: member.uid,
          causerId: member.uid,
          causerName: member.full_name,
          causerCircle: member.circle,
          timestamp: Timestamp.now(),
      };
      const activityRef = doc(collection(db, 'activity_feed'));
      batch.set(activityRef, activity);

      await batch.commit();
  },

  rejectMember: async (currentUser: User, member: Member): Promise<void> => {
      if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
      const batch = writeBatch(db);
      const memberRef = doc(db, 'members', member.id);
      batch.update(memberRef, { payment_status: 'rejected' });
      
      if (member.uid) {
          batch.update(doc(db, 'users', member.uid), { status: 'ousted' });
          batch.update(doc(db, 'publicProfiles', member.uid), { status: 'ousted' });
      }
      await batch.commit();
  },

  sendBroadcast: async (currentUser: User, message: string): Promise<Broadcast> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const newBroadcast: Omit<Broadcast, 'id'> = {
      message,
      date: new Date().toISOString(),
    };
    const docRef = await addDoc(broadcastsCollection, newBroadcast);
    return { ...newBroadcast, id: docRef.id };
  },

  getBroadcasts: async (): Promise<Broadcast[]> => {
    const q = query(broadcastsCollection, limit(20));
    const querySnapshot = await getDocs(q);
    const broadcasts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast));
    broadcasts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return broadcasts;
  },
  
   updatePaymentStatus: async (currentUser: User, memberId: string, status: Member['payment_status']): Promise<void> => {
      if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
      const memberDocRef = doc(db, 'members', memberId);
      await updateDoc(memberDocRef, { payment_status: status });
  },
  
  resetDistressQuota: async (currentUser: User, uid: string): Promise<void> => {
      if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { distress_calls_available: 2 });
  },
  
  clearLastDistressPost: async (currentUser: User, uid: string): Promise<void> => {
      if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as MemberUser;
      if (userData.last_distress_post_id) {
          const postRef = doc(db, 'posts', userData.last_distress_post_id);
          await deleteDoc(postRef);
          await updateDoc(userRef, { last_distress_post_id: null });
      }
  },

  processPendingWelcomeMessages: async (): Promise<number> => {
    const q = query(membersCollection, where("needs_welcome_update", "==", true), limit(10));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    let updateCount = 0;
    for (const memberDoc of snapshot.docs) {
        const member = { id: memberDoc.id, ...memberDoc.data() } as Member;
        try {
            const welcome_message = await generateWelcomeMessage(member.full_name, member.circle);
            const memberRef = doc(db, 'members', member.id);
            batch.update(memberRef, { welcome_message, needs_welcome_update: false });
            updateCount++;
        } catch (error) {
            console.error(`Failed to generate welcome message for synced member ${member.id}. Will retry later.`, error);
        }
    }
    if (updateCount > 0) await batch.commit();
    return updateCount;
  },

  // Member actions
  getMemberById: async (memberId: string): Promise<Member | null> => {
      const docRef = doc(db, 'members', memberId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Member;
      }
      return null;
  },
  
  fetchCommunityMembersPaginated: async (
    limitNum: number,
    lastVisible?: DocumentSnapshot<DocumentData>
  ): Promise<{ users: PublicUserProfile[], lastVisible: DocumentSnapshot<DocumentData> | null }> => {
    const constraints: any[] = [
        where('role', '==', 'member'),
        where('status', '==', 'active'),
        orderBy('name'),
        limit(limitNum)
    ];
    if (lastVisible) {
        constraints.push(startAfter(lastVisible));
    }
    const q = query(publicProfilesCollection, ...constraints);
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
    const newLastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return { users, lastVisible: newLastVisible };
  },
  
  createPost: async (author: User, content: string, type: Post['types']): Promise<Post> => {
      const newPostData: Omit<Post, 'id'> = {
          authorId: author.id,
          authorName: author.name,
          authorCircle: author.circle || 'Unknown',
          authorRole: author.role,
          content,
          date: new Date().toISOString(),
          upvotes: [],
          commentCount: 0,
          repostCount: 0,
          types: type,
      };

      // Award CCAP for helpful posts
      if (['proposal', 'offer', 'opportunity'].includes(type)) {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', author.id);
        const publicProfileRef = doc(db, 'publicProfiles', author.id);
        batch.update(userRef, { ccap: increment(20), currentCycleCcap: increment(20) });
        batch.update(publicProfileRef, { ccap: increment(20) });
        await batch.commit();
      }

      const postRef = await addDoc(postsCollection, newPostData);
      
      let activityType: Activity['type'] | null = null;
      if (type === 'proposal') activityType = 'NEW_POST_PROPOSAL';
      else if (type === 'opportunity') activityType = 'NEW_POST_OPPORTUNITY';
      else if (type === 'offer') activityType = 'NEW_POST_OFFER';
      else if (type === 'general') activityType = 'NEW_POST_GENERAL';

      if (activityType) {
          const activity: Omit<Activity, 'id'> = {
              type: activityType,
              message: `${author.name} created a new ${type} post.`,
              link: postRef.id,
              causerId: author.id,
              causerName: author.name,
              causerCircle: author.circle || 'Unknown',
              timestamp: Timestamp.now(),
          };
          await addDoc(activityFeedCollection, activity);
      }
      
      return { ...newPostData, id: postRef.id };
  },

  repostPost: async (originalPost: Post, author: User, comment: string): Promise<void> => {
    const batch = writeBatch(db);
    const newPostData: Omit<Post, 'id'> = {
        authorId: author.id,
        authorName: author.name,
        authorCircle: author.circle || 'Unknown',
        authorRole: author.role,
        content: comment,
        date: new Date().toISOString(),
        upvotes: [],
        commentCount: 0,
        repostCount: 0,
        types: 'general',
        repostedFrom: {
            postId: originalPost.id,
            authorId: originalPost.authorId,
            authorName: originalPost.authorName,
            authorCircle: originalPost.authorCircle,
            content: originalPost.content,
            date: originalPost.date,
        }
    };
    const newPostRef = doc(collection(db, 'posts'));
    batch.set(newPostRef, newPostData);
    const originalPostRef = doc(db, 'posts', originalPost.id);
    batch.update(originalPostRef, { repostCount: increment(1) });
    await batch.commit();
  },

  createDistressPost: async (currentUser: MemberUser, content: string): Promise<User> => {
      if (currentUser.role !== 'member') {
          throw new Error("Permission denied: only members can send distress calls.");
      }
      if (currentUser.distress_calls_available <= 0) {
          throw new Error("No distress calls available.");
      }
      
      const newPostData: Omit<Post, 'id'> = {
          authorId: currentUser.id,
          authorName: "Anonymous Member",
          authorCircle: currentUser.circle || 'Unknown',
          authorRole: currentUser.role,
          content,
          date: new Date().toISOString(),
          upvotes: [],
          commentCount: 0,
          repostCount: 0,
          types: 'distress',
      };
      const postRef = await addDoc(postsCollection, newPostData);
      
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
          distress_calls_available: currentUser.distress_calls_available - 1,
          last_distress_post_id: postRef.id
      });
      
      const updatedUser = await getUserProfile(currentUser.id);
      if (!updatedUser) throw new Error("Could not refetch user profile.");
      return updatedUser;
  },

  listenForPosts: (filter: Post['types'] | 'all', callback: (posts: Post[]) => void, onError: (error: Error) => void): (() => void) => {
    // This function is now only used for single-type feeds (like distress) and the old real-time 'all' feed logic is deprecated
    // in favor of the paginated fetch functions below.
    if (filter === 'all') {
      onError(new Error("'all' filter is deprecated for real-time listeners. Use paginated fetch functions instead."));
      callback([]);
      return () => {};
    }

    const q = query(postsCollection, where("types", "==", filter), limit(50));
        
    return onSnapshot(q,
        (snapshot) => {
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            callback(posts);
        },
        (error) => {
            console.error(`Firestore listener error (posts, filter: ${filter}):`, error);
            onError(error);
        }
    );
  },

  fetchPinnedPosts: async (isAdminView: boolean): Promise<Post[]> => {
    // If an admin can see pinned distress posts, they should be included.
    const typesToFetch = isAdminView ? [...PUBLIC_POST_TYPES, 'distress'] : PUBLIC_POST_TYPES;

    // Using multiple queries instead of a single 'in' query to avoid potential security rule issues.
    const promises = typesToFetch.map(type => {
        const q = query(
            postsCollection,
            where("isPinned", "==", true),
            where("types", "==", type)
        );
        return getDocs(q);
    });

    const snapshots = await Promise.all(promises);
    const allPosts: Post[] = snapshots.flatMap(snapshot => 
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
    );

    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allPosts;
  },

  fetchRegularPosts: async (
    limitNum: number, 
    typeFilter: Post['types'] | 'all',
    isAdminView: boolean,
    lastVisible?: DocumentSnapshot<DocumentData>
  ): Promise<{ posts: Post[], lastVisible: DocumentSnapshot<DocumentData> | null }> => {
    
    // If a specific type is requested, use the simple and efficient query.
    // This supports pagination correctly.
    if (typeFilter !== 'all') {
      if (typeFilter === 'distress' && !isAdminView) {
        return { posts: [], lastVisible: null };
      }
      
      const constraints: any[] = [
        where("types", "==", typeFilter),
        orderBy("date", "desc"),
        limit(limitNum)
      ];
      if (lastVisible) {
        constraints.push(startAfter(lastVisible));
      }
      const q = query(postsCollection, ...constraints);
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      const newLastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { posts, lastVisible: newLastVisible };
    }

    // --- Logic for 'all' feed ---
    // This part runs multiple queries in parallel to avoid 'IN' clauses which can fail security rules.
    // Pagination is disabled for this view to ensure stability.
    const allowedTypes = isAdminView ? [...PUBLIC_POST_TYPES, 'distress'] : PUBLIC_POST_TYPES;

    const promises = allowedTypes.map(type => {
        const q = query(
            postsCollection,
            where("types", "==", type),
            orderBy("date", "desc"),
            limit(limitNum) // Fetch `limitNum` of *each type* to build a diverse feed.
        );
        return getDocs(q);
    });

    const snapshots = await Promise.all(promises);
    const allPosts: Post[] = snapshots.flatMap(snapshot => 
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
    );

    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // We return the top `limitNum` posts, and null for lastVisible to signal that pagination is not supported for this query.
    return { posts: allPosts.slice(0, limitNum), lastVisible: null };
  },

  listenForPostsByAuthor: (authorId: string, callback: (posts: Post[]) => void, onError: (error: Error) => void): (() => void) => {
    // This function is refactored to use multiple queries to avoid `IN` clauses on the `types` field,
    // which can be problematic for Firestore security rules.
    const postMap = new Map<string, Post>();
    const allUnsubscribers: (() => void)[] = [];
    const typesToFetch = [...PUBLIC_POST_TYPES]; // Can be extended for admin view if needed

    typesToFetch.forEach(type => {
        const q = query(
            postsCollection,
            where("authorId", "==", authorId),
            where("types", "==", type),
            orderBy("date", "desc"),
            limit(50) // Limit per type to avoid over-fetching
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach(doc => {
                postMap.set(doc.id, { id: doc.id, ...doc.data() } as Post);
            });
            const allPosts = Array.from(postMap.values());
            allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            callback(allPosts);
        }, onError);

        allUnsubscribers.push(unsub);
    });

    return () => allUnsubscribers.forEach(unsub => unsub());
  },
  
  togglePinPost: async (currentUser: User, postId: string, newPinState: boolean): Promise<void> => {
    if (currentUser.role !== 'admin') {
        throw new Error("Permission denied: Admin access required.");
    }
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { isPinned: newPinState });
  },

  upvotePost: async (postId: string, userId: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post;
      if (postData.upvotes.includes(userId)) {
        // User has already liked, so unlike
        await updateDoc(postRef, { upvotes: arrayRemove(userId) });
      } else {
        // User has not liked, so like
        await updateDoc(postRef, { upvotes: arrayUnion(userId) });
        
        // Add notification if it's not the user's own post
        if (userId !== postData.authorId) {
            const upvoter = await getPublicUserProfile(userId);
            if (upvoter) {
                const notif: Omit<Notification, 'id'> = {
                    userId: postData.authorId,
                    type: 'POST_LIKE',
                    message: `${upvoter.name} liked your post.`,
                    link: postId,
                    causerId: userId,
                    causerName: upvoter.name,
                    timestamp: Timestamp.now(),
                    read: false,
                };
                const notifRef = doc(collection(db, 'notifications'));
                await setDoc(notifRef, notif);
            }
        }
      }
    }
  },

  deletePost: async (postId: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
  },
  
  deleteDistressPost: async (currentUser: User, postId: string, authorId: string): Promise<void> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const batch = writeBatch(db);
    const postRef = doc(db, 'posts', postId);
    batch.delete(postRef);
    const userRef = doc(db, 'users', authorId);
    batch.update(userRef, { last_distress_post_id: null });
    await batch.commit();
  },

  updatePost: async (postId: string, content: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { content });
  },

  reportPost: async (reporter: User, post: Post, reason: string, details: string): Promise<void> => {
    const reportData: Omit<Report, 'id'> = {
        reporterId: reporter.id,
        reporterName: reporter.name,
        postId: post.id,
        postAuthorId: post.authorId,
        postContent: post.content,
        reason,
        details,
        date: new Date().toISOString(),
        status: 'new',
    };
    await addDoc(reportsCollection, reportData);
  },
  
  reportUser: async (reporter: User, reportedUser: PublicUserProfile, reason: string, details: string): Promise<void> => {
    const reportData: Omit<UserReport, 'id'> = {
        reporterId: reporter.id,
        reporterName: reporter.name,
        reportedUserId: reportedUser.id,
        reportedUserName: reportedUser.name,
        reason,
        details,
        date: new Date().toISOString(),
        status: 'new'
    };
    await addDoc(userReportsCollection, reportData);
  },
  
  listenForReports: (currentUser: User, callback: (reports: Report[]) => void, onError: (error: Error) => void): (() => void) => {
    if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
    }
    const q = query(reportsCollection, orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        callback(reports);
    }, onError);
  },

  resolvePostReport: async(currentUser: User, reportId: string, postId: string, authorId: string): Promise<void> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const batch = writeBatch(db);
    
    // Mark report as resolved
    const reportRef = doc(db, 'reports', reportId);
    batch.update(reportRef, { status: 'resolved' });

    // Delete the offending post
    const postRef = doc(db, 'posts', postId);
    batch.delete(postRef);

    // Penalize the user in both collections
    const userRef = doc(db, 'users', authorId);
    batch.update(userRef, { credibility_score: increment(-25) });
    const publicProfileRef = doc(db, 'publicProfiles', authorId);
    batch.update(publicProfileRef, { credibility_score: increment(-25) });
    
    await batch.commit();
  },
  
  dismissReport: async(currentUser: User, reportId: string): Promise<void> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, { status: 'resolved' });
  },

  getChatContacts: async (currentUser: User, includeSelf = false): Promise<PublicUserProfile[]> => {
    if (currentUser.role === 'agent') return [];

    let users: PublicUserProfile[];

    if (currentUser.role === 'admin') {
      const q = query(publicProfilesCollection, where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      users = snapshot.docs.map(d => ({id: d.id, ...d.data()} as PublicUserProfile));
    } else { // 'member'
      const q = query(conversationsCollection, where('members', 'array-contains', currentUser.id));
      const snapshot = await getDocs(q);
      const conversations = snapshot.docs.map(doc => doc.data() as Conversation);

      const contactMap = new Map<string, PublicUserProfile>();
      conversations.forEach(convo => {
        convo.members.forEach(memberId => {
          if (!contactMap.has(memberId)) {
            contactMap.set(memberId, {
              id: memberId,
              name: convo.memberNames[memberId] || 'Unknown Member',
              role: 'member',
            });
          }
        });
      });
      users = Array.from(contactMap.values());
    }
    
    if (!includeSelf) {
      users = users.filter(user => user.id !== currentUser.id);
    }
    return users;
  },
  
  startChat: async (currentUserId: string, targetUserId: string, currentUserName: string, targetUserName: string): Promise<Conversation> => {
      // Query for conversations the current user is a part of. This is secure and efficient.
      const q = query(conversationsCollection, where('members', 'array-contains', currentUserId));
      const snapshot = await getDocs(q);

      // Filter client-side to find the specific 1-on-1 chat.
      const existingConvoDoc = snapshot.docs.find(doc => {
          const data = doc.data();
          // A 1-on-1 chat is not a group, has exactly two members, and includes the target user.
          return data.isGroup === false && data.members.length === 2 && data.members.includes(targetUserId);
      });

      if (existingConvoDoc) {
          return { id: existingConvoDoc.id, ...existingConvoDoc.data() } as Conversation;
      }
      
      // If not, create a new one
      const newConvo: Omit<Conversation, 'id'> = {
          isGroup: false,
          members: [currentUserId, targetUserId].sort(), // Store sorted for consistency
          memberNames: {
              [currentUserId]: currentUserName,
              [targetUserId]: targetUserName,
          },
          lastMessage: "Conversation started.",
          lastMessageSenderId: '',
          lastMessageTimestamp: Timestamp.now(),
          readBy: [currentUserId],
      };
      const docRef = await addDoc(conversationsCollection, newConvo);
      return { id: docRef.id, ...newConvo };
  },

  createGroupChat: async (name: string, memberIds: string[], memberNames: {[key: string]: string}): Promise<Conversation> => {
      const newGroup: Omit<Conversation, 'id'> = {
          isGroup: true,
          name,
          members: memberIds,
          memberNames,
          lastMessage: "Group created.",
          lastMessageSenderId: '',
          lastMessageTimestamp: Timestamp.now(),
          readBy: [],
      };
      const docRef = await addDoc(conversationsCollection, newGroup);
      return { id: docRef.id, ...newGroup };
  },

  getGroupMembers: async (memberIds: string[]): Promise<PublicUserProfile[]> => {
    return getPublicUserProfilesByUids(memberIds);
  },

  updateGroupMembers: async (convoId: string, newMemberIds: string[], newMemberNames: {[key:string]:string}) => {
      const convoRef = doc(db, 'conversations', convoId);
      await updateDoc(convoRef, { members: newMemberIds, memberNames: newMemberNames });
  },

  leaveGroup: async (convoId: string, userId: string) => {
      const convoRef = doc(db, 'conversations', convoId);
      const user = await getPublicUserProfile(userId);
      await updateDoc(convoRef, {
          members: arrayRemove(userId),
          lastMessage: `${user?.name} left the group.`,
          lastMessageSenderId: '',
          lastMessageTimestamp: Timestamp.now(),
      });
  },

  listenForConversations: (userId: string, callback: (convos: Conversation[]) => void, onError: (error: Error) => void): (() => void) => {
    const q = query(conversationsCollection, where('members', 'array-contains', userId));
    return onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      convos.sort((a, b) => b.lastMessageTimestamp.toMillis() - a.lastMessageTimestamp.toMillis());
      callback(convos);
    }, onError);
  },
  
  listenForMessages: (conversationId: string, callback: (messages: Message[]) => void): (() => void) => {
      const messagesCol = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesCol, orderBy('timestamp', 'asc'));
      return onSnapshot(q, async (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
          callback(messages);

          // Mark conversation as read
          const user = auth.currentUser;
          if (user) {
              const convoRef = doc(db, 'conversations', conversationId);
              await updateDoc(convoRef, { readBy: arrayUnion(user.uid) });
          }
      });
  },

  sendMessage: async (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>, conversation: Conversation): Promise<void> => {
      const batch = writeBatch(db);
      
      const messagesCol = collection(db, 'conversations', conversationId, 'messages');
      const newMessageRef = doc(messagesCol);
      batch.set(newMessageRef, { ...message, timestamp: Timestamp.now() });

      const convoRef = doc(db, 'conversations', conversationId);
      batch.update(convoRef, {
          lastMessage: message.text,
          lastMessageSenderId: message.senderId,
          lastMessageTimestamp: Timestamp.now(),
          readBy: [message.senderId], // Only sender has read it initially
      });

      // Send notifications to other members
      const sender = await getPublicUserProfile(message.senderId);
      conversation.members.forEach(memberId => {
          if (memberId !== message.senderId && sender) {
              const notif: Omit<Notification, 'id'> = {
                  userId: memberId,
                  type: 'NEW_MESSAGE',
                  message: `${conversation.isGroup ? `${sender.name} in ${conversation.name}`: sender.name}: ${message.text}`,
                  link: conversationId,
                  causerId: sender.id,
                  causerName: sender.name,
                  timestamp: Timestamp.now(),
                  read: false,
              };
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, notif);
          }
      });
      
      await batch.commit();
  },

  listenForNotifications: (userId: string, callback: (notifs: Notification[]) => void, onError: (error: Error) => void): (() => void) => {
    const q = query(notificationsCollection, where('userId', '==', userId), limit(50));
    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        // Sort by timestamp descending on the client
        notifs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        callback(notifs);
    }, onError);
  },

  listenForActivity: (circle: string | undefined, callback: (activities: Activity[]) => void, onError: (error: Error) => void): (() => void) => {
      if (!circle) {
        // If user has no circle, don't fetch community activity.
        callback([]);
        return () => {};
      }
      const q = query(activityFeedCollection, where('causerCircle', '==', circle), limit(50));
      return onSnapshot(q, (snapshot) => {
          const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
          // Sort client-side since we can't use a composite index.
          activities.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
          callback(activities);
      }, onError);
  },
  
  listenForRecentActivity: (limitNum: number, callback: (activities: Activity[]) => void, onError: (error: Error) => void): (() => void) => {
      const q = query(activityFeedCollection, orderBy('timestamp', 'desc'), limit(limitNum));
      return onSnapshot(q, (snapshot) => {
          const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
          callback(activities);
      }, onError);
  },

  listenForAllNewMemberActivity: (callback: (activities: Activity[]) => void, onError: (error: Error) => void): (() => void) => {
      const q = query(activityFeedCollection, where('type', '==', 'NEW_MEMBER'), limit(20));
      return onSnapshot(q, (snapshot) => {
          const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
          // Sort client-side since we can't use a composite index on timestamp.
          activities.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
          callback(activities);
      }, onError);
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
  },

  markAllNotificationsAsRead: async (userId: string): Promise<void> => {
    const q = query(notificationsCollection, where('userId', '==', userId), limit(100));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        // Filter for unread notifications on the client before adding to batch.
        if (doc.data().read === false) {
            batch.update(doc.ref, { read: true });
        }
    });
    await batch.commit();
  },
  
  addComment: async (parentId: string, commentData: Omit<Comment, 'id' | 'timestamp'>, parentCollection: 'posts' | 'proposals' = 'posts'): Promise<void> => {
      const batch = writeBatch(db);
      
      const commentsCol = collection(db, parentCollection, parentId, 'comments');
      const newCommentRef = doc(commentsCol);
      batch.set(newCommentRef, { ...commentData, timestamp: Timestamp.now() });

      const parentRef = doc(db, parentCollection, parentId);
      batch.update(parentRef, { commentCount: increment(1) });
      
      if (parentCollection === 'posts') {
        const postDoc = await getDoc(parentRef);
        if (postDoc.exists()) {
            const post = postDoc.data() as Post;
            if(commentData.authorId !== post.authorId) {
                const notif: Omit<Notification, 'id'> = {
                  userId: post.authorId,
                  type: 'POST_COMMENT',
                  message: `${commentData.authorName} commented on your post.`,
                  link: parentId,
                  causerId: commentData.authorId,
                  causerName: commentData.authorName,
                  timestamp: Timestamp.now(),
                  read: false,
              };
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, notif);
            }
        }
      }
      
      await batch.commit();
  },

  deleteComment: async (parentId: string, commentId: string, parentCollection: 'posts' | 'proposals' = 'posts'): Promise<void> => {
    const batch = writeBatch(db);
    const commentRef = doc(db, parentCollection, parentId, 'comments', commentId);
    batch.delete(commentRef);
    const parentRef = doc(db, parentCollection, parentId);
    batch.update(parentRef, { commentCount: increment(-1) });
    await batch.commit();
  },
  
  upvoteComment: async (parentId: string, commentId: string, userId: string, parentCollection: 'posts' | 'proposals' = 'posts'): Promise<void> => {
    const commentRef = doc(db, parentCollection, parentId, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    if (commentDoc.exists()) {
      const commentData = commentDoc.data() as Comment;
      if (commentData.upvotes.includes(userId)) {
        await updateDoc(commentRef, { upvotes: arrayRemove(userId) });
      } else {
        await updateDoc(commentRef, { upvotes: arrayUnion(userId) });
      }
    }
  },

  listenForComments: (parentId: string, callback: (comments: Comment[]) => void, parentCollection: 'posts' | 'proposals' = 'posts'): (() => void) => {
    const commentsCol = collection(db, parentCollection, parentId, 'comments');
    const q = query(commentsCol, orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      callback(comments);
    });
  },

  // Proposals
  createProposal: async (currentUser: User, proposalData: { title: string, description: string }): Promise<void> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const proposal: Omit<Proposal, 'id'> = {
        ...proposalData,
        createdBy: currentUser.id,
        createdAt: Timestamp.now(),
        status: 'active',
        votesFor: [],
        votesAgainst: [],
        voteCountFor: 0,
        voteCountAgainst: 0,
        commentCount: 0,
    };
    await addDoc(proposalsCollection, proposal);
  },

  listenForProposals: (callback: (proposals: Proposal[]) => void, onError: (error: Error) => void): (() => void) => {
    const q = query(proposalsCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
        callback(proposals);
    }, onError);
  },

  getProposal: async (proposalId: string): Promise<Proposal | null> => {
    const proposalRef = doc(db, 'proposals', proposalId);
    const proposalDoc = await getDoc(proposalRef);
    if (proposalDoc.exists()) {
        return { id: proposalDoc.id, ...proposalDoc.data() } as Proposal;
    }
    return null;
  },

  voteOnProposal: async (proposalId: string, userId: string, vote: 'for' | 'against'): Promise<void> => {
    const proposalRef = doc(db, 'proposals', proposalId);
    
    await runTransaction(db, async (transaction) => {
        const proposalDoc = await transaction.get(proposalRef);
        if (!proposalDoc.exists()) {
            throw "Proposal does not exist!";
        }

        const proposal = proposalDoc.data() as Proposal;

        if (proposal.status !== 'active') {
            throw new Error("Voting on this proposal is closed.");
        }

        if (proposal.votesFor.includes(userId) || proposal.votesAgainst.includes(userId)) {
            throw new Error("User has already voted.");
        }

        if (vote === 'for') {
            transaction.update(proposalRef, {
                votesFor: arrayUnion(userId),
                voteCountFor: increment(1)
            });
        } else {
            transaction.update(proposalRef, {
                votesAgainst: arrayUnion(userId),
                voteCountAgainst: increment(1)
            });
        }
    });
  },

  closeProposal: async (currentUser: User, proposalId: string, status: 'passed' | 'failed'): Promise<void> => {
    if (currentUser.role !== 'admin') throw new Error("Permission denied: Admin access required.");
    const proposalRef = doc(db, 'proposals', proposalId);
    await updateDoc(proposalRef, { status });
  },

  // Ventures
  getCommunityValuePool: async (): Promise<CommunityValuePool | null> => {
    const docRef = doc(db, 'community_value_pool', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CommunityValuePool;
    }
    return null;
  },

  listenForCVP: (currentUser: User, callback: (cvp: CommunityValuePool | null) => void, onError: (error: Error) => void): (() => void) => {
    if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
    }
    const docRef = doc(db, 'community_value_pool', 'main');
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as CommunityValuePool);
        } else {
            callback(null);
        }
    }, onError);
  },

  addFundsToCVP: async (adminUser: User, amount: number): Promise<void> => {
    if (adminUser.role !== 'admin') {
        throw new Error("Permission denied.");
    }
    const cvpRef = doc(db, 'community_value_pool', 'main');
    await runTransaction(db, async (transaction) => {
        const cvpDoc = await transaction.get(cvpRef);
        if (!cvpDoc.exists()) {
            // Creates the document if it doesn't exist
            const initialCVP: Omit<CommunityValuePool, 'id'> = {
                total_usd_value: amount,
                total_circulating_ccap: 0,
                ccap_to_usd_rate: 0,
            };
            transaction.set(cvpRef, initialCVP);
        } else {
            const cvpData = cvpDoc.data() as CommunityValuePool;
            const newTotalUsdValue = (cvpData.total_usd_value || 0) + amount;
            const newRate = cvpData.total_circulating_ccap > 0 ? newTotalUsdValue / cvpData.total_circulating_ccap : 0;
            transaction.update(cvpRef, {
                total_usd_value: increment(amount),
                ccap_to_usd_rate: newRate
            });
        }
    });
  },

  createVenture: async (ventureData: Omit<Venture, 'id' | 'createdAt' | 'fundingRaisedCcap' | 'backers' | 'status' | 'totalSharesIssued' | 'totalProfitsDistributed' | 'ticker'> & { name: string }): Promise<Venture> => {
    const ticker = ventureData.name.substring(0, 4).toUpperCase().replace(/\s/g, '') + '-VEQ';
    
    const newVentureData: Omit<Venture, 'id'> = {
        ...ventureData,
        ticker,
        createdAt: Timestamp.now(),
        fundingRaisedCcap: 0,
        backers: [],
        status: 'pending_approval',
        totalSharesIssued: 1000000, // Default share amount
        totalProfitsDistributed: 0,
    };
    const docRef = await addDoc(venturesCollection, newVentureData);
    return { id: docRef.id, ...newVentureData };
  },

  getVentures: async (status: Venture['status']): Promise<Venture[]> => {
    const q = query(venturesCollection, where('status', '==', status), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venture));
  },
  
  getVentureById: async (ventureId: string): Promise<Venture | null> => {
    const ventureRef = doc(db, 'ventures', ventureId);
    const ventureDoc = await getDoc(ventureRef);
    if (ventureDoc.exists()) {
        return { id: ventureDoc.id, ...ventureDoc.data() } as Venture;
    }
    return null;
  },

  listenForVentures: (currentUser: User, callback: (ventures: Venture[]) => void, onError: (error: Error) => void): (() => void) => {
    if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
    }
    const q = query(venturesCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const ventures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venture));
        callback(ventures);
    }, onError);
  },

  updateVentureStatus: async (adminUser: User, ventureId: string, status: Venture['status']): Promise<void> => {
    if (adminUser.role !== 'admin') {
        throw new Error("Permission denied.");
    }
    const ventureRef = doc(db, 'ventures', ventureId);
    await updateDoc(ventureRef, { status });
  },

  investInVenture: async (userId: string, userName: string, ventureId: string, ccapAmount: number): Promise<Venture> => {
    const ventureRef = doc(db, 'ventures', ventureId);
    const userRef = doc(db, 'users', userId);
    const publicProfileRef = doc(db, 'publicProfiles', userId);

    return runTransaction(db, async (transaction) => {
        const [ventureDoc, userDoc] = await Promise.all([
            transaction.get(ventureRef),
            transaction.get(userRef),
        ]);

        if (!ventureDoc.exists()) throw new Error("Venture not found.");
        if (!userDoc.exists()) throw new Error("User not found.");

        const venture = ventureDoc.data() as Omit<Venture, 'id'>;
        const user = userDoc.data() as MemberUser;

        if ((user.ccap || 0) < ccapAmount) {
            throw new Error("Insufficient CCAP balance.");
        }
        if (venture.status !== 'fundraising') {
            throw new Error("This venture is not currently fundraising.");
        }
        
        const newFundingRaised = venture.fundingRaisedCcap + ccapAmount;
        const newBacker = { userId, userName, ccapPledged: ccapAmount };
        const newStatus = newFundingRaised >= venture.fundingGoalCcap ? 'fully_funded' : 'fundraising';


        transaction.update(userRef, {
            ccap: increment(-ccapAmount),
        });
        transaction.update(publicProfileRef, {
            ccap: increment(-ccapAmount),
        });

        transaction.update(ventureRef, {
            fundingRaisedCcap: newFundingRaised,
            backers: arrayUnion(newBacker),
            status: newStatus,
        });
        
        const updatedBackers = [...venture.backers, newBacker];
        const updatedVentureData: Venture = { 
            ...(venture as Venture),
            id: ventureId, 
            fundingRaisedCcap: newFundingRaised, 
            backers: updatedBackers,
            status: newStatus,
        };
        
        return updatedVentureData;
    });
  },

  getVentureMembers: async (limitNum: number): Promise<{ users: PublicUserProfile[] }> => {
    const q = query(
        publicProfilesCollection, 
        where('role', '==', 'member'),
        where('isLookingForPartners', '==', true),
        limit(limitNum)
    );
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => doc.data() as PublicUserProfile);
    return { users };
  },

  getDistributionsForUserInVenture: async (user: User, ventureId: string, userShares: number, totalShares: number): Promise<Distribution[]> => {
    // FIX: Only admins can list all distributions. This prevents permission errors for members.
    // The underlying data model would need to change to support per-user distribution history securely.
    if (user.role !== 'admin') {
        return [];
    }
    const distributionsCol = collection(db, 'ventures', ventureId, 'distributions');
    const q = query(distributionsCol, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Distribution));
  },

  performDailyCheckin: async (userId: string): Promise<Partial<User>> => {
    const userRef = doc(db, 'users', userId);
    const publicProfileRef = doc(db, 'publicProfiles', userId);
    let updatedFields: Partial<User> = {};
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        
        const userData = userDoc.data() as MemberUser;
        const now = new Date();
        const lastCheckin = userData.lastDailyCheckin?.toDate();
        
        if (lastCheckin && (now.getTime() - lastCheckin.getTime()) < 24 * 60 * 60 * 1000) {
            throw new Error("You have already checked in for this 24-hour period.");
        }
        
        const newScap = (userData.scap || 0) + 10;
        const newTimestamp = Timestamp.now();
        
        transaction.update(userRef, { scap: increment(10), lastDailyCheckin: newTimestamp });
        transaction.update(publicProfileRef, { scap: increment(10) });
        
        updatedFields = { scap: newScap, lastDailyCheckin: newTimestamp };
    });
    return updatedFields;
  },

  submitPriceVerification: async (userId: string, commodity: string, price: number, shop: string): Promise<void> => {
      const batch = writeBatch(db);
      
      const priceVerificationRef = doc(collection(db, 'price_verifications'));
      batch.set(priceVerificationRef, {
          userId,
          commodity,
          price: Number(price),
          shop,
          timestamp: Timestamp.now(),
      });
      
      batch.update(doc(db, 'users', userId), { ccap: increment(15), currentCycleCcap: increment(15) });
      batch.update(doc(db, 'publicProfiles', userId), { ccap: increment(15) });

      await batch.commit();
  },

  submitKnowledgeContribution: async (userId: string, knowledge: string): Promise<void> => {
      const batch = writeBatch(db);
      
      const knowledgeRef = doc(collection(db, 'knowledge_contributions'));
      batch.set(knowledgeRef, {
          userId,
          knowledge,
          status: 'pending', // for admin review
          timestamp: Timestamp.now(),
      });
      
      batch.update(doc(db, 'users', userId), { ccap: increment(25), currentCycleCcap: increment(25) });
      batch.update(doc(db, 'publicProfiles', userId), { ccap: increment(25) });
      
      await batch.commit();
  },
  
  submitVendorVerification: async (userId: string, name: string, location: string): Promise<void> => {
      const batch = writeBatch(db);
      
      const vendorVerificationRef = doc(vendorVerificationsCollection);
      batch.set(vendorVerificationRef, {
          userId,
          vendorName: name,
          location,
          status: 'pending', // for admin review
          timestamp: Timestamp.now(),
      });
      
      batch.update(doc(db, 'users', userId), { ccap: increment(30), currentCycleCcap: increment(30) });
      batch.update(doc(db, 'publicProfiles', userId), { ccap: increment(30) });
      
      await batch.commit();
  },

  listenForReferredUsers: (userId: string, callback: (users: PublicUserProfile[]) => void, onError: (error: Error) => void): (() => void) => {
    const q = query(publicProfilesCollection, where("referredBy", "==", userId));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUserProfile));
        callback(users);
    }, onError);
  },

  requestPayout: async (user: User, ecocashName: string, ecocashNumber: string, amount: number): Promise<void> => {
    const userRef = doc(db, 'users', user.id);
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");

        const currentEarnings = userDoc.data().referralEarnings || 0;
        if (amount > currentEarnings) {
            throw new Error("Withdrawal amount exceeds your available earnings.");
        }

        const payoutRequestRef = doc(collection(db, 'payout_requests'));
        const newPayout: Omit<PayoutRequest, 'id'> = {
            userId: user.id,
            userName: user.name,
            ecocashName,
            ecocashNumber,
            amount,
            status: 'pending',
            requestedAt: Timestamp.now(),
            type: 'referral',
        };
        transaction.set(payoutRequestRef, newPayout);
        transaction.update(userRef, { referralEarnings: increment(-amount) });
    });
  },

  requestVeqPayout: async (user: User, holding: VentureEquityHolding, shares: number, ecocashName: string, ecocashNumber: string): Promise<void> => {
    if (shares <= 0 || shares > holding.shares) {
      throw new Error("Invalid number of shares to redeem.");
    }
    
    const payoutRequest: Omit<PayoutRequest, 'id'> = {
      userId: user.id,
      userName: user.name,
      ecocashName,
      ecocashNumber,
      amount: shares,
      status: 'pending',
      requestedAt: Timestamp.now(),
      type: 'veq_redemption',
      meta: {
        ventureId: holding.ventureId,
        ventureName: holding.ventureName,
      },
    };
    await addDoc(payoutRequestsCollection, payoutRequest);
  },

  listenForUserPayouts: (userId: string, callback: (payouts: PayoutRequest[]) => void, onError: (error: Error) => void): (() => void) => {
    const q = query(payoutRequestsCollection, where("userId", "==", userId), orderBy("requestedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
        callback(payouts);
    }, onError);
  },

  listenForPayoutRequests: (currentUser: User, callback: (payouts: PayoutRequest[]) => void, onError: (error: Error) => void): (() => void) => {
    if (currentUser.role !== 'admin') {
        onError(new Error("Permission denied: Admin access required."));
        return () => {};
    }
    const q = query(payoutRequestsCollection, orderBy("requestedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
        callback(payouts);
    }, onError);
  },

  updatePayoutStatus: async (payoutId: string, status: 'completed' | 'rejected'): Promise<void> => {
      const payoutRef = doc(db, 'payout_requests', payoutId);
      const updateData: { status: 'completed' | 'rejected', completedAt?: Timestamp } = { status };
      if (status === 'completed') {
          updateData.completedAt = Timestamp.now();
      }
      await updateDoc(payoutRef, updateData);
  },
  
  // Redemption Protocol
  getCurrentRedemptionCycle: async (): Promise<RedemptionCycle | null> => {
    const q = query(redemptionCyclesCollection, where('status', 'in', ['active', 'window_open']), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as RedemptionCycle;
    }
    return null;
  },
  
  getFundraisingVentures: async (): Promise<Venture[]> => {
      const q = query(venturesCollection, where('status', '==', 'fundraising'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venture));
  },
  
  redeemCcapForCash: async (user: User, ecocashName: string, ecocashNumber: string, amountToRedeem: number): Promise<void> => {
     const payoutRequest: Omit<PayoutRequest, 'id'> = {
        userId: user.id,
        userName: user.name,
        ecocashName,
        ecocashNumber,
        amount: amountToRedeem,
        status: 'pending',
        requestedAt: Timestamp.now(),
        type: 'ccap_redemption',
     };
     await addDoc(payoutRequestsCollection, payoutRequest);
  },

  stakeCcapForNextCycle: async(user: MemberUser): Promise<void> => {
    const userRef = doc(db, 'users', user.id);
    const bonus = user.currentCycleCcap * 0.10;
    await updateDoc(userRef, {
        stakedCcap: increment(user.currentCycleCcap + bonus),
        currentCycleCcap: 0,
        lastCycleChoice: 'staked',
    });
  },
  
  convertCcapToVeq: async(user: MemberUser, venture: Venture, ccapToConvert: number, ccapValue: number): Promise<void> => {
      const usdValue = ccapToConvert * ccapValue;
      // This is a simplified share calculation. A real system would have a share price.
      const sharesToAward = Math.floor((usdValue / venture.fundingGoalUsd) * venture.totalSharesIssued);
      if (sharesToAward <= 0) {
          throw new Error("Calculated investment is too small to award shares.");
      }

      const userRef = doc(db, 'users', user.id);
      const existingHoldingIndex = user.ventureEquity?.findIndex(h => h.ventureId === venture.id) ?? -1;

      const updatedEquity = [...(user.ventureEquity || [])];

      if (existingHoldingIndex > -1) {
          updatedEquity[existingHoldingIndex].shares += sharesToAward;
      } else {
          updatedEquity.push({
              ventureId: venture.id,
              ventureName: venture.name,
              ventureTicker: venture.ticker,
              shares: sharesToAward,
          });
      }

      await updateDoc(userRef, {
        currentCycleCcap: 0,
        lastCycleChoice: 'invested',
        ventureEquity: updatedEquity,
      });
  },
  
  redeemVoucher: async (vendor: VendorUser, voucherId: string): Promise<number> => {
    const voucherRef = doc(db, 'sustenance_vouchers', voucherId);
    const vendorRef = doc(db, 'users', vendor.id);

    return runTransaction(db, async (transaction) => {
        const voucherDoc = await transaction.get(voucherRef);
        if (!voucherDoc.exists()) {
            throw new Error("Voucher not found.");
        }

        const voucher = voucherDoc.data() as SustenanceVoucher;
        if (voucher.status !== 'active') {
            throw new Error(`Voucher has already been ${voucher.status}.`);
        }
        if (voucher.expiresAt.toDate() < new Date()) {
            throw new Error("Voucher has expired.");
        }

        transaction.update(voucherRef, {
            status: 'redeemed',
            redeemedAt: firestoreServerTimestamp(),
            redeemedBy: vendor.id,
        });

        transaction.update(vendorRef, {
            balance: increment(voucher.value),
        });

        return voucher.value;
    });
  },

  getSustenanceFund: async (): Promise<SustenanceCycle | null> => {
    const fundRef = doc(db, 'sustenance_funds', 'main');
    const docSnap = await getDoc(fundRef);

    if (docSnap.exists()) {
        return docSnap.data() as SustenanceCycle;
    }
    
    return null;
  },

  getAllSustenanceVouchers: async (): Promise<SustenanceVoucher[]> => {
    const q = query(sustenanceVouchersCollection, orderBy('issuedAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SustenanceVoucher));
  },

  initializeSustenanceFund: async (adminUser: User, initialBalance: number, hamperCost: number): Promise<void> => {
    if (adminUser.role !== 'admin') {
        throw new Error("Permission denied.");
    }
    const fundRef = doc(db, 'sustenance_funds', 'main');
    const docSnap = await getDoc(fundRef);

    if (docSnap.exists()) {
        throw new Error("Sustenance fund is already initialized.");
    }

    const newFundData: Partial<SustenanceCycle> = {
        slf_balance: initialBalance,
        hamper_cost: hamperCost,
    };
    
    await setDoc(fundRef, newFundData);
  },

  runSustenanceLottery: async (adminUser: User): Promise<SustenanceCycle> => {
    if (adminUser.role !== 'admin') {
      throw new Error("Permission denied.");
    }

    const fundRef = doc(db, 'sustenance_funds', 'main');

    return runTransaction(db, async (transaction) => {
      const fundDoc = await transaction.get(fundRef);
      if (!fundDoc.exists()) {
        throw new Error("Sustenance fund not initialized.");
      }
      const fundData = fundDoc.data() as SustenanceCycle;
      const { slf_balance, hamper_cost } = fundData;

      if (slf_balance < hamper_cost) {
        throw new Error("Insufficient funds in the Sustenance & Logistics Fund to run the lottery.");
      }

      const winners_count = Math.floor(slf_balance / hamper_cost);
      if (winners_count === 0) {
        throw new Error("Not enough funds for even one hamper.");
      }

      const membersQuery = query(usersCollection, where('role', '==', 'member'), where('status', '==', 'active'));
      const membersSnapshot = await getDocs(membersQuery);

      const lotteryPool: { userId: string; name: string; tickets: number }[] = [];
      membersSnapshot.forEach(doc => {
        const member = doc.data() as MemberUser;
        const tickets = Math.floor((member.scap || 0) * 0.1 + (member.ccap || 0));
        if (tickets > 0) {
          lotteryPool.push({ userId: member.id, name: member.name, tickets });
        }
      });
      
      if (lotteryPool.length === 0) {
          throw new Error("No eligible members with sustenance tickets found.");
      }

      const weightedLottery: string[] = [];
      lotteryPool.forEach(p => {
          for (let i = 0; i < p.tickets; i++) {
              weightedLottery.push(p.userId);
          }
      });
      
      for (let i = weightedLottery.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weightedLottery[i], weightedLottery[j]] = [weightedLottery[j], weightedLottery[i]];
      }

      const winners = new Set<string>();
      let i = 0;
      while (winners.size < winners_count && i < weightedLottery.length) {
          winners.add(weightedLottery[i]);
          i++;
      }
      
      const winnerIds = Array.from(winners);
      const now = Timestamp.now();
      const cycleId = `${now.toDate().getFullYear()}-${String(now.toDate().getMonth() + 1).padStart(2, '0')}-${now.toDate().getDate()}`;
      
      winnerIds.forEach(winnerId => {
        const winnerData = lotteryPool.find(p => p.userId === winnerId);
        const voucherRef = doc(sustenanceVouchersCollection);
        const newVoucher: SustenanceVoucher = {
            id: voucherRef.id,
            userId: winnerId,
            userName: winnerData?.name || 'Unknown',
            cycleId: cycleId,
            value: hamper_cost,
            status: 'active',
            issuedAt: now,
            expiresAt: Timestamp.fromDate(new Date(now.toDate().getTime() + 60 * 24 * 60 * 60 * 1000)), // 60 days
        };
        transaction.set(voucherRef, newVoucher);

        const userRef = doc(db, 'users', winnerId);
        transaction.update(userRef, { sustenanceVouchers: arrayUnion(newVoucher) });
      });
      
      const fundsSpent = winnerIds.length * hamper_cost;

      const newCycleLog: SustenanceCycle = {
          id: cycleId,
          date: now,
          slf_balance: slf_balance - fundsSpent,
          hamper_cost,
          winners_count: winnerIds.length,
          winner_ids: winnerIds,
      };
      const cycleLogRef = doc(sustenanceCyclesCollection, cycleId);
      transaction.set(cycleLogRef, newCycleLog);

      transaction.update(fundRef, { slf_balance: increment(-fundsSpent) });
      
      return newCycleLog;
    });
  },

};