import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api } from '../services/apiService';
import { auth, db } from '../services/firebase';
import { User, Agent, NewPublicMemberData, MemberUser, Member } from '../types';

// Define the shape of the context value
interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isProcessingAuth: boolean;
  login: (credentials: Pick<User, 'email' | 'password'>) => Promise<void>;
  logout: () => Promise<void>;
  agentSignup: (credentials: Pick<Agent, 'name' | 'email' | 'password' | 'circle'>) => Promise<void>;
  memberSignup: (memberData: NewPublicMemberData, password: string) => Promise<void>;
  memberActivate: (member: Member, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User> & { isCompletingProfile?: boolean }) => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let userDocListener: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous user document listener if it exists
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
            if (userData.status === 'ousted') {
              // Only show toast and log out if the user was *already* logged in and then ousted.
              if(currentUser?.id === userData.id) {
                addToast('Your account has been suspended.', 'error');
                api.logout(); // This will trigger onAuthStateChanged again to clear state.
              }
            } else {
              setCurrentUser(userData);
            }
          } else {
            // This case handles a user who has an auth entry but no firestore doc.
            // This can happen if signup fails midway. isProcessingAuth helps prevent
            // logging them out during the signup process itself.
            if (!isProcessingAuth) {
              console.warn("User document not found for authenticated user. This could be an orphaned account. Logging out.");
              api.logout();
            }
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          addToast("Connection to your profile was lost. Please log in again.", "error");
          api.logout();
        });
        
        api.setupPresence(user.uid);
      } else {
        // User is logged out or null
        setCurrentUser(null);
      }
      
      // Set loading to false once the initial check is complete.
      setIsLoadingAuth(false);
    });

    return () => {
      unsubscribeAuth(); // Unsubscribe from auth state changes
      if (userDocListener) {
        userDocListener(); // Unsubscribe from user doc changes
      }
    };
  }, [addToast, isProcessingAuth]); // isProcessingAuth is crucial to prevent race conditions during signup.

  const login = useCallback(async (credentials: Pick<User, 'email' | 'password'>) => {
    try {
      const user = await api.login(credentials.email, credentials.password);
      if (user) {
        addToast('Logged in successfully!', 'success');
      } else {
        addToast('Login failed: User profile not found.', 'error');
        await api.logout();
        throw new Error("Login failed: Profile not found.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      if (errorMessage.includes("suspended")) {
        addToast('This account has been suspended.', 'error');
      } else if (!errorMessage.includes("Profile not found")) {
        addToast('Invalid credentials. Please check your email and password.', 'error');
      }
      throw error;
    }
  }, [addToast]);

  const logout = useCallback(async () => {
    if (currentUser) {
        api.goOffline(currentUser.id);
    }
    await api.logout();
    addToast('You have been logged out.', 'info');
  }, [addToast, currentUser]);

  const agentSignup = useCallback(async (credentials: Pick<Agent, 'name' | 'email' | 'password' | 'circle'>) => {
    setIsProcessingAuth(true);
    try {
      await api.signup(credentials.name, credentials.email, credentials.password, credentials.circle);
      addToast(`Account created successfully! Welcome.`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addToast(`Signup failed: ${errorMessage}`, 'error');
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  }, [addToast]);

  const memberSignup = useCallback(async (memberData: NewPublicMemberData, password: string) => {
    setIsProcessingAuth(true);
    try {
        await api.memberSignup(memberData, password);
        addToast(`Registration submitted! An admin will review your application.`, 'success');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addToast(`Signup failed: ${errorMessage}`, 'error');
        throw error;
    } finally {
        setIsProcessingAuth(false);
    }
  }, [addToast]);

  const memberActivate = useCallback(async (member: Member, password: string) => {
    setIsProcessingAuth(true);
    try {
        await api.activateMemberAccount(member, password);
        addToast(`Account activated! Welcome to the commons.`, 'success');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addToast(`Activation failed: ${errorMessage}`, 'error');
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
      // The onSnapshot listener will automatically update the context state.
      // We just need to call the API to write the changes.
      await api.updateUser(currentUser.id, updatedData); 
      if (!updatedData.isCompletingProfile) {
        addToast('Profile updated successfully!', 'success');
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      addToast('Profile update failed.', 'error');
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
    memberSignup,
    memberActivate,
    sendPasswordReset,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create the custom hook for consuming the context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};