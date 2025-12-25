
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, setDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
import { cryptoService, VaultData } from '../services/cryptoService';
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
  isSovereignLocked: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
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

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (userDocListener) {
        userDocListener();
        userDocListener = undefined;
      }

      if (user && !user.isAnonymous) {
        // WE HAVE A SESSION: Force loading to true until Firestore provides the profile
        setIsLoadingAuth(true);

        const userDocRef = doc(db, 'users', user.uid);
        
        userDocListener = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;

            if (userData.status === 'ousted') {
              addToast('Node terminated by authority.', 'error');
              api.logout();
              setCurrentUser(null);
            } else {
              setCurrentUser(userData);
              
              const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
              const hasVault = cryptoService.hasVault();

              if (!hasVault || isUnlocked) {
                  const localPubKey = cryptoService.getPublicKey();
                  if (localPubKey && userData.publicKey !== localPubKey) {
                      await api.updateUser(user.uid, { publicKey: localPubKey });
                  }
              }
            }
          } else {
            // Document doesn't exist yet (could be a fresh registration)
            setCurrentUser(null);
          }
          
          // DATA ARRIVED: Now we can safely unlock the UI
          setIsLoadingAuth(false);
          setIsProcessingAuth(false);
        }, (error) => {
          console.error("Profile synchronization error:", error);
          setIsLoadingAuth(false);
          setIsProcessingAuth(false);
        });
        
        api.setupPresence(user.uid);
      } else {
        // NO SESSION: Unauthenticated state
        setCurrentUser(null);
        setIsLoadingAuth(false);
        setIsProcessingAuth(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (userDocListener) userDocListener();
    };
  }, [addToast]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsProcessingAuth(true);
    try {
      await api.login(credentials.email, credentials.password);
      
      const pin = sessionStorage.getItem('ugc_temp_pin');
      if (pin) {
        await cryptoService.updateVaultCredentials(credentials.email, credentials.password, pin);
      }
      
      // Note: We do NOT set isProcessingAuth(false) here. 
      // The onSnapshot listener in the useEffect above will handle it.
    } catch (error: any) {
      setIsProcessingAuth(false);
      addToast(error.message || 'Handshake failed', 'error');
      throw error;
    }
  }, [addToast]);

  const unlockSovereignSession = useCallback(async (data: VaultData, pin: string) => {
      setIsProcessingAuth(true);
      try {
          sessionStorage.setItem('ugc_temp_pin', pin);
          sessionStorage.setItem('ugc_node_unlocked', 'true');
          
          if (data.email && data.password && !auth.currentUser) {
              await api.login(data.email, data.password);
          }
          
          setIsSovereignLocked(false);
          addToast("Identity Reconstituted.", "success");
          // loading handled by listener
      } catch (err) {
          setIsSovereignLocked(false); 
          setIsProcessingAuth(false);
          addToast("Cloud Sync Offline. Manual auth required.", "info");
      }
  }, [addToast]);

  const logout = useCallback(async () => {
    if (currentUser) api.goOffline(currentUser.id);
    sessionStorage.removeItem('ugc_node_unlocked');
    sessionStorage.removeItem('ugc_temp_pin');
    cryptoService.clearSession();
    await api.logout();
    addToast('Session terminated.', 'info');
  }, [currentUser, addToast]);

  const agentSignup = useCallback(async (credentials: AgentSignupCredentials) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      const { user } = userCredential;
      const pubKey = cryptoService.getPublicKey() || "";

      const pin = sessionStorage.getItem('ugc_temp_pin');
      if (pin) {
        await cryptoService.updateVaultCredentials(credentials.email, credentials.password, pin);
      }

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
      addToast(`Facilitator Node Created. Verify email.`, 'success');
      // loading handled by listener
    } catch (error: any) {
      setIsProcessingAuth(false);
      addToast(`Protocol error: ${error.message}`, 'error');
      throw error;
    }
  }, [addToast]);
  
  const publicMemberSignup = useCallback(async (memberData: NewPublicMemberData, password: string) => {
    setIsProcessingAuth(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
        const { user } = userCredential;
        const pubKey = cryptoService.getPublicKey() || "";

        const pin = sessionStorage.getItem('ugc_temp_pin');
        if (pin) {
            await cryptoService.updateVaultCredentials(memberData.email, password, pin);
        }

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
        addToast('Identity anchored. Verify email.', 'success');
        // loading handled by listener
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast(`Deployment error: ${error.message}`, 'error');
        throw error;
    }
  }, [addToast]);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
        await api.sendPasswordReset(email);
        addToast(`Reset anchor sent.`, 'success');
    } catch (error) {
        addToast("Handshake failed.", "error");
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
        addToast('Ledger update failed.', 'error');
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
