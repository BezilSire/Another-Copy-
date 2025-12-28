
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, sendEmailVerification, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, Timestamp, setDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
import { cryptoService, VaultData } from '../services/cryptoService';
import { auth, db } from '../services/firebase';
import { User, Agent, NewPublicMemberData } from '../types';
import { generateReferralCode, generateAgentCode } from '../utils';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isProcessingAuth: boolean;
  isSovereignLocked: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  loginAnonymously: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
  unlockSovereignSession: (data: VaultData, pin: string) => Promise<void>;
  // FIX: Added missing exported methods to interface
  agentSignup: (credentials: Pick<Agent, 'name' | 'email' | 'circle'> & { password: string }) => Promise<void>;
  publicMemberSignup: (data: NewPublicMemberData, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
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
    let unsubUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (unsubUserDoc) unsubUserDoc();

      if (user) {
        if (user.isAnonymous) {
            setCurrentUser({
                id: user.uid,
                name: sessionStorage.getItem('ugc_guest_name') || 'Guest Citizen',
                role: 'member',
                status: 'active',
                circle: 'GLOBAL',
                isProfileComplete: true,
                createdAt: Timestamp.now(),
                lastSeen: Timestamp.now()
            } as any);
            setIsLoadingAuth(false);
            return;
        }

        unsubUserDoc = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            setCurrentUser({ id: doc.id, ...doc.data() } as User);
          } else {
            setCurrentUser(null);
          }
          setIsLoadingAuth(false);
        }, () => {
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
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const unlockSovereignSession = useCallback(async (data: VaultData, pin: string) => {
      setIsProcessingAuth(true);
      try {
          sessionStorage.setItem('ugc_node_unlocked', 'true');
          sessionStorage.setItem('ugc_temp_pin', pin);
          setIsSovereignLocked(false);
          addToast("Node Synchronized.", "success");
      } finally {
          setIsProcessingAuth(false);
      }
  }, [addToast]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setIsProcessingAuth(true);
    try {
      await api.login(credentials.email, credentials.password);
    } catch (error: any) {
      addToast(error.message || 'Handshake failed', 'error');
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  }, [addToast]);

  const loginAnonymously = useCallback(async (displayName: string) => {
    setIsProcessingAuth(true);
    try {
        sessionStorage.setItem('ugc_guest_name', displayName);
        await api.loginAnonymously(displayName);
    } catch (error: any) {
        addToast("Guest Bridge Failed.", "error");
        throw error;
    } finally {
        setIsProcessingAuth(false);
    }
  }, [addToast]);

  const logout = useCallback(async () => {
    if (currentUser) api.goOffline(currentUser.id);
    sessionStorage.removeItem('ugc_node_unlocked');
    cryptoService.clearSession();
    await api.logout();
    addToast('Node Disconnected.', 'info');
  }, [currentUser, addToast]);

  const agentSignup = useCallback(async (credentials: Pick<Agent, 'name' | 'email' | 'circle'> & { password: string }) => {
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
        publicKey: pubKey,
      };

      await setDoc(doc(db, 'users', user.uid), newAgent);
      await sendEmailVerification(user);
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
            payment_status: 'pending_verification',
            registration_amount: 10,
            welcome_message: `Welcome, ${memberData.full_name}. Node operational.`,
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
            publicKey: pubKey,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
        });

        await batch.commit();
        await sendEmailVerification(user);
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

  const updateUser = useCallback(async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    try {
        await api.updateUser(currentUser.id, updatedData);
        addToast('Identity State Synced.', 'success');
    } catch (error: any) {
        addToast('Sync failed.', 'error');
        throw error;
    }
  }, [currentUser, addToast]);

  return (
    <AuthContext.Provider value={{ 
        currentUser, firebaseUser, isLoadingAuth, isProcessingAuth, isSovereignLocked, 
        login, loginAnonymously, logout, updateUser, unlockSovereignSession,
        agentSignup, publicMemberSignup, sendPasswordReset 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
