
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, setDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { auth, db } from '../services/firebase';
import { User, Agent, NewPublicMemberData, MemberUser } from '../types';
import { generateReferralCode, generateAgentCode } from '../utils';

type LoginCredentials = { email: string; password: string };
type AgentSignupCredentials = Pick<Agent, 'name' | 'email' | 'circle'> & { password: string };

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isProcessingAuth: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  agentSignup: (credentials: AgentSignupCredentials) => Promise<void>;
  publicMemberSignup: (data: NewPublicMemberData, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User> & { isCompletingProfile?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const { addToast } = useToast();

  const isProcessingAuthRef = useRef(isProcessingAuth);
  useEffect(() => {
    isProcessingAuthRef.current = isProcessingAuth;
  }, [isProcessingAuth]);

  // Main Auth and User Profile Listener
  useEffect(() => {
    let userDocListener: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      
      // Clean up previous Firestore listener if it exists
      if (userDocListener) {
        userDocListener();
        userDocListener = undefined;
      }

      if (user && !user.isAnonymous) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Listen for user document changes
        userDocListener = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            
            // Check for ousted status
            if (userData.status === 'ousted') {
              addToast('This account has been suspended.', 'error');
              api.logout();
            } else {
              setCurrentUser(userData);
            }
          } else {
            // Document doesn't exist. Only log out if we aren't in the middle of a signup process
            if (!isProcessingAuthRef.current) {
              console.warn("User document not found for active auth session.");
              setCurrentUser(null);
            }
          }
          setIsLoadingAuth(false);
        }, (error) => {
          console.error("Firestore Profile Listener Error:", error);
          if (error.code === 'permission-denied') {
             // Often happens if rules are being updated or session is stale
             addToast("Access to your node profile was denied. Please re-sign in.", "error");
             api.logout();
          }
          setIsLoadingAuth(false);
        });
        
        api.setupPresence(user.uid);
      } else {
        setCurrentUser(null);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (userDocListener) userDocListener();
    };
  }, [addToast]);

  // Dedicated effect for identity synchronization to prevent blocking the profile listener
  useEffect(() => {
    if (currentUser && !currentUser.publicKey) {
        const syncKeys = async () => {
            try {
                const keys = cryptoService.getOrGenerateSigningKeys();
                console.log("Synchronizing secure node address...");
                await api.updateUser(currentUser.id, { publicKey: keys.publicKey });
            } catch (e) {
                console.error("Identity sync failed:", e);
            }
        };
        syncKeys();
    }
  }, [currentUser?.id, currentUser?.publicKey]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsProcessingAuth(true);
    try {
      await api.login(credentials.email, credentials.password);
    } catch (error: any) {
      console.error("Login Error:", error);
      let message = 'Invalid credentials. Check email and password.';
      if (error.code === 'auth/network-request-failed') message = 'Network connection failed.';
      addToast(message, 'error');
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  }, [addToast]);

  const logout = useCallback(async () => {
    if (currentUser) {
        api.goOffline(currentUser.id);
    }
    await api.logout();
  }, [currentUser]);

  const agentSignup = useCallback(async (credentials: AgentSignupCredentials) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      const { user } = userCredential;
      const keys = cryptoService.getOrGenerateSigningKeys();

      const newAgent: Omit<Agent, 'id'> = {
        name: credentials.name,
        email: credentials.email,
        name_lowercase: credentials.name.toLowerCase(),
        role: 'agent',
        status: 'pending',
        circle: credentials.circle,
        agent_code: generateAgentCode(),
        referralCode: generateReferralCode(),
        createdAt: Timestamp.now(),
        lastSeen: Timestamp.now(),
        isProfileComplete: false,
        hasCompletedInduction: true,
        commissionBalance: 0,
        referralEarnings: 0,
        publicKey: keys.publicKey,
      };

      await setDoc(doc(db, 'users', user.uid), newAgent);
      await sendEmailVerification(user);
      addToast(`Agent profile created. Verification email sent.`, 'success');
    } catch (error: any) {
      addToast(`Signup failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  }, [addToast]);
  
  const publicMemberSignup = useCallback(async (memberData: NewPublicMemberData, password: string) => {
    setIsProcessingAuth(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
        const { user } = userCredential;
        const keys = cryptoService.getOrGenerateSigningKeys();
        const batch = writeBatch(db);
        
        let referrerId = '';
        if (memberData.referralCode) {
            const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', memberData.referralCode), limit(1));
            const snapshot = await getDocs(referrerQuery);
            if (!snapshot.empty) referrerId = snapshot.docs[0].id;
        }
        
        const memberRef = doc(collection(db, 'members'));
        batch.set(memberRef, {
            full_name: memberData.full_name,
            email: memberData.email,
            uid: user.uid,
            agent_id: 'PUBLIC_SIGNUP',
            agent_name: 'Self-Registered',
            date_registered: serverTimestamp(),
            payment_status: 'pending_verification',
            registration_amount: 10,
            welcome_message: `Welcome, ${memberData.full_name}!`,
            membership_card_id: `UGC-M-${generateReferralCode()}`,
            phone: '', circle: '',
        });

        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, {
            name: memberData.full_name,
            email: memberData.email,
            name_lowercase: memberData.full_name.toLowerCase(),
            role: 'member',
            status: 'pending',
            isProfileComplete: false,
            member_id: memberRef.id,
            credibility_score: 100,
            distress_calls_available: 1,
            referralCode: generateReferralCode(),
            referredBy: memberData.referralCode || '',
            referrerId: referrerId,
            hasCompletedInduction: false,
            phone: '', address: '', circle: '', id_card_number: '',
            ubtBalance: 0, initialUbtStake: 0,
            publicKey: keys.publicKey,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
        });

        await batch.commit();
        await sendEmailVerification(user);
        addToast('Welcome! Check your email to verify your node.', 'success');
    } catch (error: any) {
        addToast(`Signup error: ${error.message}`, 'error');
        throw error;
    } finally {
        setIsProcessingAuth(false);
    }
  }, [addToast]);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
        await api.sendPasswordReset(email);
        addToast(`Recovery link sent to ${email}.`, 'success');
    } catch (error) {
        addToast("Recovery failed. Check address and retry.", "error");
        throw error;
    }
  }, [addToast]);

  const updateUser = useCallback(async (updatedData: Partial<User> & { isCompletingProfile?: boolean } = {}) => {
    if (!currentUser) return;
    try {
        const { isCompletingProfile, ...userData } = updatedData;
        if (Object.keys(userData).length > 0) {
            await api.updateUser(currentUser.id, userData);
        }
        if (!isCompletingProfile) addToast('Profile updated!', 'success');
    } catch (error: any) {
        addToast('Update failed.', 'error');
        throw error;
    }
  }, [currentUser, addToast]);

  const value = {
    currentUser,
    firebaseUser,
    isLoadingAuth,
    isProcessingAuth,
    login,
    logout,
    agentSignup,
    publicMemberSignup,
    sendPasswordReset,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
