
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInAnonymously, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api, handleFirestoreError, OperationType } from '../services/apiService';
import { cryptoService, VaultData } from '../services/cryptoService';
import { auth, db } from '../services/firebase';
import { User, NewPublicMemberData, LoginCredentials } from '../types';
import { generateReferralCode, formatFirestoreError } from '../utils';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isProcessingAuth: boolean;
  isSovereignLocked: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: NewPublicMemberData & { mnemonic?: string }, password: string) => Promise<void>;
  restoreWallet: (mnemonic: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User> & { isCompletingProfile?: boolean }) => Promise<void>;
  unlockSovereignSession: (data: VaultData, pin: string) => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [isSovereignLocked, setIsSovereignLocked] = useState(false);
  
  const { addToast } = useToast();

  // Optimized Sync: Establish entry first, enrich data second
  const syncIdentity = useCallback(async (uid: string, email: string | null, displayName?: string | null) => {
    try {
        console.log("Identity Sync: Starting for UID:", uid);
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            console.log("Identity Sync: Found user document.");
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            
            // Fetch private data safely
            let privateData = {};
            try {
                const privateDocRef = doc(db, 'users', uid, 'private', 'data');
                const privateDoc = await getDoc(privateDocRef);
                if (privateDoc.exists()) {
                    console.log("Identity Sync: Found private data.");
                    privateData = privateDoc.data();
                }
            } catch (privateErr) {
                console.warn("Private data access restricted or missing:", privateErr);
            }
            
            const enrichedUser = { ...userData, ...privateData } as User;
            setCurrentUser(enrichedUser);
            
            const serverVault = (userData as any).encryptedVault;
            if (serverVault && !cryptoService.hasVault()) {
                cryptoService.injectVault(serverVault);
            }
            
            const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
            setIsSovereignLocked(cryptoService.hasVault() && !isUnlocked);
        } else {
            console.log("Identity Sync: User document missing, provisioning skeletal user.");
            // Provision skeletal user for new Google/Social logins
            const skeletalUser: any = {
                id: uid,
                name: displayName || email?.split('@')[0] || 'Citizen',
                email: email || '',
                role: 'member',
                status: 'active',
                circle: 'GLOBAL',
                isProfileComplete: true,
                hasCompletedInduction: true,
                createdAt: Timestamp.now(),
                lastSeen: Timestamp.now(),
                distress_calls_available: 1,
                ubtBalance: 0,
                initialUbtStake: 0,
                credibility_score: 100,
                referralCode: generateReferralCode(),
                publicKey: cryptoService.getPublicKey() || ""
            };
            
            setCurrentUser(skeletalUser);
            
            // Attempt to save if it's a real auth session
            if (auth.currentUser && !auth.currentUser.isAnonymous) {
                const batch = writeBatch(db);
                batch.set(userDocRef, skeletalUser);
                batch.set(doc(db, 'users', uid, 'private', 'data'), { email: email || '' });
                batch.commit().then(() => {
                    console.log("Identity Sync: Skeletal user provisioned in Firestore.");
                }).catch(err => console.error("Failed to provision new user doc:", err));
            }
        }
    } catch (e) {
        console.error("Identity sync error:", e);
        handleFirestoreError(e, OperationType.GET, `users/${uid}`);
    } finally {
        setIsLoadingAuth(false);
        setIsProcessingAuth(false);
    }
  }, [addToast]);

  const refreshIdentity = async () => {
    if (firebaseUser) {
        setIsProcessingAuth(true);
        await syncIdentity(firebaseUser.uid, firebaseUser.email);
        setIsProcessingAuth(false);
    }
  };

  useEffect(() => {
    let userDocListener: (() => void) | undefined;

    console.log("Auth: Initializing onAuthStateChanged listener...");
    
    // Safety timeout for initial auth load
    const authTimeout = setTimeout(() => {
        if (isLoadingAuth) {
            console.warn("Auth: Initial load timeout reached. Forcing load state to false.");
            setIsLoadingAuth(false);
            setIsProcessingAuth(false);
        }
    }, 12000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("Auth: State changed. User:", user ? user.uid : "null");
      setFirebaseUser(user);
      if (userDocListener) {
          console.log("Auth: Unsubscribing previous user doc listener.");
          userDocListener();
      }

      if (user) {
        clearTimeout(authTimeout);
        // Immediate Entry Protocol
        if (user.isAnonymous) {
            console.log("Auth: Anonymous guest session detected.");
            const guestName = sessionStorage.getItem('ugc_guest_name') || 'Guest Citizen';
            setCurrentUser({ id: user.uid, name: guestName, role: 'member', status: 'active', circle: 'GLOBAL', isProfileComplete: true, distress_calls_available: 0 } as any);
            setIsLoadingAuth(false);
            setIsProcessingAuth(false);
            return;
        }

        // Parallel Sync: Start listener but also fetch current state immediately
        const userDocRef = doc(db, 'users', user.uid);
        syncIdentity(user.uid, user.email, user.displayName).catch(err => {
            console.error("Auth: syncIdentity background failed:", err);
        });

        console.log("Auth: Setting up user document listener for UID:", user.uid);
        userDocListener = onSnapshot(userDocRef, async (userDoc) => {
          console.log("Auth: User document snapshot received.");
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            
            // Fetch private data safely
            let privateData = {};
            try {
                const privateDoc = await getDoc(doc(db, 'users', user.uid, 'private', 'data'));
                if (privateDoc.exists()) {
                    privateData = privateDoc.data();
                }
            } catch (privateErr) {
                console.warn("Private data listener fetch failed:", privateErr);
            }
            
            const enrichedUser = { ...userData, ...privateData } as User;
            setCurrentUser(enrichedUser);

            const serverVault = (userData as any).encryptedVault;
            if (serverVault && !cryptoService.hasVault()) {
                cryptoService.injectVault(serverVault);
            }

            const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
            setIsSovereignLocked(cryptoService.hasVault() && !isUnlocked);
          } else {
            console.warn("User document does not exist for UID:", user.uid);
          }
          setIsLoadingAuth(false);
          setIsProcessingAuth(false);
        }, (error) => {
          console.error("User document listener error:", error);
          setIsLoadingAuth(false);
          setIsProcessingAuth(false);
          addToast(formatFirestoreError(error.message), "error");
        });
        
        try {
            api.setupPresence(user.uid);
        } catch (presenceError) {
            console.error("Presence setup failed:", presenceError);
        }
      } else {
        console.log("Auth: No authenticated user.");
        setCurrentUser(null);
        setIsLoadingAuth(false);
        setIsProcessingAuth(false);
      }
    }, (error) => {
      console.error("Auth: onAuthStateChanged error:", error);
      setIsLoadingAuth(false);
      setIsProcessingAuth(false);
      addToast("Authentication service error. Please try again later.", "error");
    });

    return () => {
      console.log("Auth: Cleaning up AuthProvider listeners.");
      clearTimeout(authTimeout);
      unsubscribeAuth();
      if (userDocListener) userDocListener();
    };
  }, [syncIdentity, addToast]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsProcessingAuth(true);
    console.log("Starting login handshake for:", credentials.email);
    
    // Safety timeout: Reset processing state if it takes too long
    const timeoutId = setTimeout(() => {
        setIsProcessingAuth(prev => {
            if (prev) {
                console.warn("Login handshake timed out.");
                addToast("Handshake timeout. Please check your connection.", "error");
            }
            return false;
        });
    }, 15000);

    try {
      const user = await api.login(credentials.email, credentials.password);
      console.log("Firebase Auth success for UID:", user.uid);
      // We don't set isProcessingAuth(false) here, we wait for onAuthStateChanged/onSnapshot
      // but we clear the timeout
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      setIsProcessingAuth(false); 
      console.error("Login error:", error);
      addToast(error.message || 'Identity Handshake Failed', 'error');
      throw error;
    }
  }, [addToast, isProcessingAuth]);

  const loginWithGoogle = useCallback(async () => {
    setIsProcessingAuth(true);
    try {
        await api.loginWithGoogle();
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast(error.message || 'Google Authentication Failed', 'error');
    }
  }, [addToast]);

  const loginAnonymously = useCallback(async (displayName: string) => {
    setIsProcessingAuth(true);
    try {
        sessionStorage.setItem('ugc_guest_name', displayName);
        await signInAnonymously(auth);
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast("Bridge access failed.", "error");
    }
  }, [addToast]);

  const unlockSovereignSession = useCallback(async (data: VaultData, pin: string) => {
      setIsProcessingAuth(true);
      try {
          sessionStorage.setItem('ugc_temp_pin', pin);
          sessionStorage.setItem('ugc_node_unlocked', 'true');
          setIsSovereignLocked(false);
          
          if (firebaseUser) await syncIdentity(firebaseUser.uid, firebaseUser.email);
          
          setIsProcessingAuth(false);
          addToast("Identity Verified.", "success");
      } catch (err) {
          setIsProcessingAuth(false);
          addToast("Verification failed.", "error");
      }
  }, [addToast, firebaseUser, syncIdentity]);

  const logout = useCallback(async () => {
    if (currentUser) api.goOffline(currentUser.id);
    sessionStorage.removeItem('ugc_node_unlocked');
    sessionStorage.removeItem('ugc_temp_pin');
    sessionStorage.removeItem('ugc_guest_name');
    cryptoService.clearSession();
    await api.logout();
  }, [currentUser]);

  const signup = useCallback(async (memberData: NewPublicMemberData & { mnemonic?: string }, password: string) => {
    setIsProcessingAuth(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
        const { user } = userCredential;
        
        // Use provided mnemonic or generate one if missing (though UI should provide it now)
        const mnemonic = memberData.mnemonic || cryptoService.generateMnemonic();
        const keys = cryptoService.mnemonicToKeyPair(mnemonic);
        
        // Save vault locally
        await cryptoService.saveVault({ mnemonic, email: memberData.email }, password);
        const encryptedVault = localStorage.getItem('gcn_encrypted_vault') || "";

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
            payment_status: 'complete',
            registration_amount: 10,
            welcome_message: `Welcome, ${memberData.full_name}. Account active.`,
            membership_card_id: `UGC-M-${generateReferralCode()}`,
            phone: '', circle: '',
        });

        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, {
            name: memberData.full_name,
            name_lowercase: memberData.full_name.toLowerCase(),
            role: 'member',
            status: 'active',
            isProfileComplete: true,
            member_id: memberRef.id,
            credibility_score: 100,
            distress_calls_available: 1,
            referralCode: generateReferralCode(),
            referredBy: memberData.referralCode || '',
            referrerId: referrerId,
            hasCompletedInduction: true,
            circle: '',
            ubtBalance: 0, initialUbtStake: 0,
            publicKey: keys.publicKey,
            encryptedVault: encryptedVault, // Backup for ease of access
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
        });

        batch.set(doc(db, 'users', user.uid, 'private', 'data'), {
            email: memberData.email,
            phone: '',
            address: '',
            id_card_number: '',
            mnemonic: mnemonic // Also backup in private data
        });

        await batch.commit();
        await sendEmailVerification(user);
        sessionStorage.setItem('ugc_node_unlocked', 'true');
        setIsSovereignLocked(false);
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast(error.message, 'error');
    }
  }, [addToast]);

  const restoreWallet = useCallback(async (mnemonic: string, email: string, password: string) => {
    setIsProcessingAuth(true);
    try {
        if (!cryptoService.validateMnemonic(mnemonic)) {
            throw new Error("Invalid 12-word phrase.");
        }

        // Try to login first
        let user;
        try {
            const cred = await api.login(email, password);
            user = cred.uid;
        } catch (e) {
            // If user doesn't exist in Firebase, we might need to create them
            // But for now let's assume they exist if they have an account.
            // If they don't, we can "reconstruct" by creating a new Firebase user with this email
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            user = cred.user.uid;
        }

        // Save vault locally
        await cryptoService.saveVault({ mnemonic, email }, password);
        const keys = cryptoService.mnemonicToKeyPair(mnemonic);
        const encryptedVault = localStorage.getItem('gcn_encrypted_vault') || "";

        // Update user doc with public key and vault backup
        const userRef = doc(db, 'users', user);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            await setDoc(userRef, { 
                publicKey: keys.publicKey,
                encryptedVault: encryptedVault
            }, { merge: true });
        } else {
            // Reconstruct skeletal user if missing from Firestore
            await setDoc(userRef, {
                id: user,
                name: email.split('@')[0],
                email: email,
                role: 'member',
                status: 'active',
                ubtBalance: 0,
                publicKey: keys.publicKey,
                encryptedVault: encryptedVault,
                createdAt: serverTimestamp()
            });
        }

        sessionStorage.setItem('ugc_node_unlocked', 'true');
        setIsSovereignLocked(false);
        addToast("Wallet Restored Successfully", "success");
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast(error.message, 'error');
    }
  }, [addToast]);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
        await api.sendPasswordReset(email);
        addToast(`Recovery dispatched.`, 'success');
    } catch (error: any) {
        addToast(error.message, "error");
    }
  }, [addToast]);

  const updateUser = useCallback(async (updatedData: Partial<User> & { isCompletingProfile?: boolean } = {}) => {
    if (!currentUser) return;
    try {
        const { isCompletingProfile, ...userData } = updatedData;
        await api.updateUser(currentUser.id, userData);
        if (!isCompletingProfile) addToast('Identity updated.', 'success');
    } catch (error: any) {
        addToast('Update failed.', 'error');
    }
  }, [currentUser, addToast]);

  const value = {
    currentUser,
    firebaseUser,
    isLoadingAuth,
    isProcessingAuth,
    isSovereignLocked,
    login,
    loginWithGoogle,
    loginAnonymously,
    logout,
    signup,
    restoreWallet,
    sendPasswordReset,
    updateUser,
    unlockSovereignSession,
    refreshIdentity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
