
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, setDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
import { cryptoService, VaultData } from '../services/cryptoService';
import { auth, db } from '../services/firebase';
import { User, Agent, NewPublicMemberData } from '../types';
import { generateReferralCode, generateAgentCode } from '../utils';

type LoginCredentials = { email: string; password: string };
type AgentSignupCredentials = Pick<Agent, 'name' | 'email' | 'circle'> & { password: string };

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isProcessingAuth: boolean;
  isSovereignLocked: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAnonymously: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  agentSignup: (credentials: AgentSignupCredentials) => Promise<void>;
  publicMemberSignup: (data: NewPublicMemberData, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User> & { isCompletingProfile?: boolean }) => Promise<void>;
  unlockSovereignSession: (data: VaultData, pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  
  const [isSovereignLocked, setIsSovereignLocked] = useState(
    cryptoService.hasVault() && !sessionStorage.getItem('ugc_node_unlocked')
  );

  const { addToast } = useToast();

  useEffect(() => {
    let userDocListener: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (userDocListener) {
        userDocListener();
        userDocListener = undefined;
      }

      if (user) {
        if (user.isAnonymous) {
            const guestName = sessionStorage.getItem('ugc_guest_name') || 'Guest Citizen';
            setCurrentUser({
                id: user.uid,
                name: guestName,
                role: 'member',
                status: 'active',
                circle: 'GLOBAL',
                isProfileComplete: true,
                hasCompletedInduction: true,
                createdAt: Timestamp.now(),
                lastSeen: Timestamp.now()
            } as any);
            setIsLoadingAuth(false);
            setIsProcessingAuth(false);
            return;
        }

        const userDocRef = doc(db, 'users', user.uid);
        userDocListener = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setCurrentUser(userData);
          } else {
            setCurrentUser(null);
          }
          
          setIsLoadingAuth(false);
          setIsProcessingAuth(false);
        }, (error) => {
          console.warn("Node synchronization restricted:", error.message);
          setIsLoadingAuth(false);
          setIsProcessingAuth(false);
        });
        
        api.setupPresence(user.uid);
      } else {
        setCurrentUser(null);
        setIsLoadingAuth(false);
        setIsProcessingAuth(false);
      }
    }, (error) => {
      console.error("Auth status sync failed:", error);
      setIsLoadingAuth(false);
    });

    return () => {
      unsubscribeAuth();
      if (userDocListener) userDocListener();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsProcessingAuth(true);
    try {
      await api.login(credentials.email, credentials.password);
    } catch (error: any) {
      setIsProcessingAuth(false); 
      addToast(error.message || 'Handshake failed', 'error');
      throw error;
    }
  }, [addToast]);

  const loginAnonymously = useCallback(async (displayName: string) => {
    setIsProcessingAuth(true);
    try {
        sessionStorage.setItem('ugc_guest_name', displayName);
        await signInAnonymously(auth);
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast("Guest Bridge Failed. Check connection.", "error");
        throw error;
    }
  }, [addToast]);

  const unlockSovereignSession = useCallback(async (data: VaultData, pin: string) => {
      setIsProcessingAuth(true);
      try {
          sessionStorage.setItem('ugc_temp_pin', pin);
          sessionStorage.setItem('ugc_node_unlocked', 'true');
          setIsSovereignLocked(false);
          setIsProcessingAuth(false);
      } catch (err) {
          setIsProcessingAuth(false);
          addToast("Node Identity Restricted.", "info");
      }
  }, [addToast]);

  const logout = useCallback(async () => {
    if (currentUser) api.goOffline(currentUser.id);
    sessionStorage.removeItem('ugc_node_unlocked');
    sessionStorage.removeItem('ugc_temp_pin');
    sessionStorage.removeItem('ugc_guest_name');
    sessionStorage.removeItem('ugc_active_meeting_id');
    cryptoService.clearSession();
    await api.logout();
    addToast('Node Disconnected.', 'info');
  }, [currentUser, addToast]);

  const agentSignup = useCallback(async (credentials: AgentSignupCredentials) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      const { user } = userCredential;
      const pubKey = cryptoService.getPublicKey() || "";

      const newAgent: Omit<Agent, 'id'> = {
        name: credentials.name,
        email: credentials.email,
        name_lowercase: credentials.name.toLowerCase(),
        role: 'agent',
        status: 'active', // Immediately active
        circle: credentials.circle,
        agent_code: generateAgentCode(),
        referralCode: generateReferralCode(),
        createdAt: Timestamp.now(),
        lastSeen: Timestamp.now(),
        isProfileComplete: false,
        hasCompletedInduction: true,
        commissionBalance: 0,
        referralEarnings: 0,
        publicKey: pubKey,
      };

      await setDoc(doc(db, 'users', user.uid), newAgent);
      addToast("Agent Node Deployed Successfully.", "success");
    } catch (error: any) {
      setIsProcessingAuth(false);
      addToast(error.message, 'error');
      throw error;
    }
  }, [addToast]);
  
  const publicMemberSignup = useCallback(async (memberData: NewPublicMemberData, password: string) => {
    setIsProcessingAuth(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
        const { user } = userCredential;
        const pubKey = cryptoService.getPublicKey() || "";

        const batch = writeBatch(db);
        let referrerId = '';
        if (memberData.referralCode) {
            const snapshot = await getDocs(query(collection(db, 'users'), where('referralCode', '==', memberData.referralCode), limit(1)));
            if (!snapshot.empty) referrerId = snapshot.docs[0].id;
        }
        
        const memberRef = doc(collection(db, 'members'));
        batch.set(memberRef, {
            full_name: memberData.full_name,
            email: memberData.email,
            uid: user.uid,
            agent_id: 'GENESIS_PROTOCOL',
            agent_name: 'Self-Registered',
            date_registered: serverTimestamp(),
            payment_status: 'complete', // Immediately complete
            registration_amount: 10,
            welcome_message: `Welcome, ${memberData.full_name}. Citizen Node operational.`,
            membership_card_id: `UGC-M-${generateReferralCode()}`,
            phone: '', circle: '',
        });

        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, {
            name: memberData.full_name,
            email: memberData.email,
            name_lowercase: memberData.full_name.toLowerCase(),
            role: 'member',
            status: 'active', // Immediately active
            isProfileComplete: false,
            member_id: memberRef.id,
            credibility_score: 100,
            distress_calls_available: 1,
            referralCode: generateReferralCode(),
            referredBy: memberData.referralCode || '',
            referrerId: referrerId,
            hasCompletedInduction: true,
            phone: '', address: '', circle: '', id_card_number: '',
            ubtBalance: 0, initialUbtStake: 0,
            publicKey: pubKey,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
        });

        await batch.commit();
        addToast("Citizen Node Anchored Successfully.", "success");
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast(error.message, 'error');
        throw error;
    }
  }, [addToast]);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
        await api.sendPasswordReset(email);
        addToast(`Recovery dispatched.`, 'success');
    } catch (error) {
        addToast("Reset failed.", "error");
        throw error;
    }
  }, [addToast]);

  const updateUser = useCallback(async (updatedData: Partial<User> & { isCompletingProfile?: boolean } = {}) => {
    if (!currentUser) return;
    try {
        const { isCompletingProfile, ...userData } = updatedData;
        await api.updateUser(currentUser.id, userData);
        if (!isCompletingProfile) addToast('State Synced.', 'success');
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
    isSovereignLocked,
    login,
    loginAnonymously,
    logout,
    agentSignup,
    publicMemberSignup,
    sendPasswordReset,
    updateUser,
    unlockSovereignSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
