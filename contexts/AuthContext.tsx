import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
import { auth, db } from '../services/firebase';
import { User, Agent, NewPublicMemberData } from '../types';
import { generateReferralCode } from '../utils';

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

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (userDocListener) {
        userDocListener();
        userDocListener = undefined;
      }
      setFirebaseUser(user);

      if (user && !user.isAnonymous) {
        const userDocRef = doc(db, 'users', user.uid);
        
        userDocListener = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;

            if (!userData.referralCode) {
              const newReferralCode = generateReferralCode();
              api.updateUser(userDoc.id, { referralCode: newReferralCode }).catch(err => {
                console.error("Failed to backfill referral code:", err);
              });
              userData.referralCode = newReferralCode;
            }

            if (userData.status === 'ousted') {
              if (currentUserRef.current?.id === userData.id) {
                addToast('Your account has been suspended.', 'error');
                api.logout();
              }
            } else {
              setCurrentUser(userData);
            }
          } else {
            // It might take a moment for the user doc to be created.
            // Only log out if we are not in the middle of a signup process.
            if (!isProcessingAuthRef.current) {
              console.warn("User document not found for authenticated user. Logging out.");
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
      // Success is handled by onAuthStateChanged
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
      await api.agentSignup(userCredential.user, credentials.name, credentials.circle);
      addToast(`Account created successfully! Welcome.`, 'success');
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string; customData?: any };
      let message = `Signup failed: ${firebaseError.message || 'Please try again.'}`;
      
      switch (firebaseError.code) {
          case 'auth/email-already-in-use':
              message = 'An account with this email address already exists.';
              break;
          case 'auth/invalid-email':
              message = 'Please enter a valid email address.';
              break;
          case 'auth/weak-password':
              message = 'Password is too weak. It must be at least 6 characters.';
              break;
      }
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
      await sendEmailVerification(userCredential.user);
      await api.publicMemberSignup(userCredential.user, memberData.full_name, memberData.referralCode);
    } catch (error: any) {
        let message = `Signup failed: ${error.message || 'Please try again.'}`;
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = 'An account with this email address already exists. Please log in.';
                    break;
                case 'auth/invalid-email':
                    message = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    message = 'Password is too weak. It must be at least 6 characters.';
                    break;
            }
        }
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

  const updateUser = useCallback(async (updatedData: Partial<User> & { isCompletingProfile?: boolean }) => {
    if (!currentUser) return;
    try {
        // Destructure the transient `isCompletingProfile` flag to prevent it from being sent to Firestore.
        const { isCompletingProfile, ...userData } = updatedData;
        await api.updateUser(currentUser.id, userData);
        if (!isCompletingProfile) {
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
        throw error; // Re-throw so component knows save failed
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