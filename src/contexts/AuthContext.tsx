
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, setDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
// import { cryptoService } from '../services/cryptoService'; // Disabled
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

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    let userDocListener: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (userDocListener) {
        userDocListener();
        userDocListener = undefined;
      }
      setFirebaseUser(user);

      if (user && !user.isAnonymous) {
        const userDocRef = doc(db, 'users', user.uid);
        
        userDocListener = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;

            if (userData.status === 'ousted') {
              if (currentUserRef.current?.id === userData.id) {
                addToast('Your account has been suspended.', 'error');
                api.logout();
              }
            } else {
              setCurrentUser(userData);
              
              // E2EE Key Initialization (Disabled)
              /*
              const keys = cryptoService.getOrGenerateKeyPair();
              if (userData.publicKey !== keys.publicKey) {
                  console.log("Publishing public key for E2EE...");
                  await api.updateUser(user.uid, { publicKey: keys.publicKey });
              }
              */
            }
          } else {
            if (!isProcessingAuthRef.current) {
              console.warn("User document not found for authenticated user. Logging out.");
              addToast("Your user profile could not be found. Please sign up again or contact support if the issue persists.", "error");
              api.logout();
            }
          }
          setIsLoadingAuth(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          addToast("Connection to your profile was lost. Please log in again.", "error");
          api.logout();
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
      if (userDocListener) {
        userDocListener();
      }
    };
  }, [addToast]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsProcessingAuth(true);
    try {
      await api.login(credentials.email, credentials.password);
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      const errorCode = firebaseError.code || '';

      if (errorCode.includes('auth/invalid-credential') || errorCode.includes('auth/wrong-password') || errorCode.includes('auth/user-not-found')) {
        addToast('Invalid credentials. Please check your email and password.', 'error');
      } else if (errorCode.includes('auth/network-request-failed')) {
        addToast('Network error. Please check your connection and try again.', 'error');
      } else {
        addToast(`Login failed: ${firebaseError.message || 'An unknown error occurred.'}`, 'error');
      }
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
    addToast('You have been logged out.', 'info');
  }, [addToast, currentUser]);

  const agentSignup = useCallback(async (credentials: AgentSignupCredentials) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      const { user } = userCredential;

      // const keys = cryptoService.getOrGenerateKeyPair(); // Disabled

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
        // publicKey: keys.publicKey, // Disabled
      };

      await setDoc(doc(db, 'users', user.uid), newAgent);
      await sendEmailVerification(user);
      addToast(`Account created for ${credentials.name}! A verification email has been sent.`, 'success');

    } catch (error) {
      const firebaseError = error as { code?: string; message?: string; customData?: any };
      let message = `Signup failed: ${firebaseError.message || 'Please try again.'}`;
      addToast(message, 'error');
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

        const batch = writeBatch(db);
        let referrerId = '';
        if (memberData.referralCode) {
            const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', memberData.referralCode), limit(1));
            const snapshot = await getDocs(referrerQuery);
            if (!snapshot.empty) {
                referrerId = snapshot.docs[0].id;
            }
        }
        
        const welcomeMessage = `Welcome, ${memberData.full_name}! We're thrilled to have you join the Global Commons Network. Explore, connect, and let's build a better future together.`;

        const memberRef = doc(collection(db, 'members'));
        const newMemberDoc = {
            full_name: memberData.full_name,
            email: memberData.email,
            uid: user.uid,
            agent_id: 'PUBLIC_SIGNUP',
            agent_name: 'Self-Registered',
            date_registered: serverTimestamp(),
            payment_status: 'pending_verification',
            registration_amount: 10,
            welcome_message: welcomeMessage,
            membership_card_id: `UGC-M-${generateReferralCode()}`,
            phone: '',
            circle: '',
        };
        batch.set(memberRef, newMemberDoc);

        // const keys = cryptoService.getOrGenerateKeyPair(); // Disabled

        const userRef = doc(db, 'users', user.uid);
        const newUserDoc: Omit<MemberUser, 'id' | 'createdAt' | 'lastSeen'> = {
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
            phone: '',
            address: '',
            circle: '',
            id_card_number: '',
            ubtBalance: 0,
            initialUbtStake: 0,
            // publicKey: keys.publicKey, // Disabled
        };
        batch.set(userRef, {...newUserDoc, createdAt: serverTimestamp(), lastSeen: serverTimestamp()});

        await batch.commit();
        await sendEmailVerification(user);
        addToast('Account created! A verification email has been sent.', 'success');
    } catch (error: any) {
        let message = `Signup failed: ${error.message || 'Please try again.'}`;
        addToast(message, 'error');
        throw error;
    } finally {
        setIsProcessingAuth(false);
    }
}, [addToast]);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
        await api.sendPasswordReset(email);
        addToast(`A password reset link has been sent to ${email}.`, 'success');
    } catch (error) {
        addToast("Failed to send password reset email. Please check the address and try again.", "error");
        throw error;
    }
  }, [addToast]);

  const updateUser = useCallback(async (updatedData: Partial<User> & { isCompletingProfile?: boolean } = {}) => {
    if (!currentUser) return;
    
    const safeData = updatedData || {};

    try {
        const { isCompletingProfile, ...userData } = safeData;
        
        if (Object.keys(userData).length > 0) {
            await api.updateUser(currentUser.id, userData);
        }
        
        if (!isCompletingProfile && Object.keys(userData).length > 0) {
            addToast('Profile updated successfully!', 'success');
        }
    } catch (error: any) {
        console.error("Failed to update user:", error);
        let errorMessage = 'Profile update failed.';
        if (error.code === 'permission-denied') {
            errorMessage = 'Save failed due to a permissions issue. Please contact support.';
        } else if (error.message) {
            errorMessage = `An unexpected error occurred: ${error.message}`;
        }
        addToast(errorMessage, 'error');
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
