
import { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInAnonymously, sendEmailVerification, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { api, handleFirestoreError, OperationType } from '../services/apiService';
import { cryptoService, VaultData, UGC_DEFAULT_NODE_PIN } from '../services/cryptoService';
import { getAuthInstance, getDbInstance } from '../services/firebase';
import { User, NewPublicMemberData, LoginCredentials } from '../types';
import { generateReferralCode, formatFirestoreError } from '../utils';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isProcessingAuth: boolean;
  isAuthReady: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: NewPublicMemberData & { mnemonic?: string }, password: string) => Promise<void>;
  restoreWallet: (mnemonic: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User> & { isCompletingProfile?: boolean }) => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = getAuthInstance();
  const db = getDbInstance();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const attemptAutoUnlock = useCallback(async (uid: string) => {
    if (!cryptoService.hasVault()) return false;
    const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
    if (isUnlocked) return true;

    // 1. Try UID (New standard)
    let vaultData = await cryptoService.unlockVault(uid);
    if (vaultData) {
        sessionStorage.setItem('ugc_node_unlocked', 'true');
        sessionStorage.setItem('ugc_temp_pin', uid);
        return true;
    }

    // 2. Try Default Pin (Legacy fallback)
    vaultData = await cryptoService.unlockVault(UGC_DEFAULT_NODE_PIN);
    if (vaultData) {
        sessionStorage.setItem('ugc_node_unlocked', 'true');
        sessionStorage.setItem('ugc_temp_pin', UGC_DEFAULT_NODE_PIN);
        
        // Auto-migrate to UID-based anchoring
        console.log("Auth: Auto-migrating legacy vault to UID-based anchoring...");
        await cryptoService.saveVault(vaultData, uid);
        const encryptedVault = localStorage.getItem('gcn_encrypted_vault');
        if (encryptedVault && db) {
            await setDoc(doc(db, 'users', uid), { encryptedVault }, { merge: true });
        }
        sessionStorage.setItem('ugc_temp_pin', uid);
        return true;
    }

    return false;
  }, []);
  
  const { addToast } = useToast();

  // Optimized Sync: Establish entry first, enrich data second
  const syncIdentity = useCallback(async (uid: string, email: string | null, displayName?: string | null) => {
    if (!db) return;
    try {
        console.log("Identity Sync: Starting for UID:", uid);
        const userDocRef = doc(db, 'users', uid);
        const privateDocRef = doc(db, 'users', uid, 'private', 'data');
        
        // Parallel fetch for speed
        const [userDoc, privateDoc] = await Promise.all([
            getDoc(userDocRef),
            getDoc(privateDocRef).catch(err => {
                console.warn("Private data access restricted or missing:", err);
                return null;
            })
        ]);
        
        if (userDoc.exists()) {
            console.log("Identity Sync: Found user document.");
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            
            let privateData = {};
            if (privateDoc && privateDoc.exists()) {
                console.log("Identity Sync: Found private data.");
                privateData = privateDoc.data();
            }
            
            const enrichedUser = { ...userData, ...privateData } as User;
            setCurrentUser(enrichedUser);
            
            const serverVault = (userData as any).encryptedVault;
            if (serverVault && !cryptoService.hasVault()) {
                cryptoService.injectVault(serverVault);
            }
            
            const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
            if (!isUnlocked) {
                attemptAutoUnlock(uid);
            }
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
            if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
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
    if (!firebaseUser || !db) return;
    setIsProcessingAuth(true);
    await syncIdentity(firebaseUser.uid, firebaseUser.email);
    setIsProcessingAuth(false);
  };

  useEffect(() => {
    let userDocListener: (() => void) | undefined;

    console.log("Auth: Initializing onAuthStateChanged listener...");
    
    if (!auth) {
      setIsLoadingAuth(false);
      setIsAuthReady(true);
      return;
    }

    // Set persistence to local to ensure sessions are remembered
    setPersistence(auth, browserLocalPersistence).catch(err => {
        console.warn("Auth: Failed to set persistence:", err);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("Auth: State changed. User:", user ? user.uid : "null");
      setFirebaseUser(user);
      
      if (userDocListener) {
          userDocListener();
          userDocListener = undefined;
      }

      if (user) {
        if (user.isAnonymous) {
            const guestName = sessionStorage.getItem('ugc_guest_name') || 'Guest Citizen';
            setCurrentUser({ id: user.uid, name: guestName, role: 'member', status: 'active', circle: 'GLOBAL', isProfileComplete: true, distress_calls_available: 0 } as any);
            setIsLoadingAuth(false);
            setIsAuthReady(true);
            return;
        }

        // Background Sync: Load user data
        if (db) {
          const userDocRef = doc(db, 'users', user.uid);
          
          console.log("Auth: Setting up user document listener for UID:", user.uid);
          userDocListener = onSnapshot(userDocRef, async (userDoc) => {
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              setCurrentUser(userData);

              const serverVault = (userData as any).encryptedVault;
              if (serverVault && !cryptoService.hasVault()) {
                  cryptoService.injectVault(serverVault);
              }

              const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
              if (!isUnlocked) {
                  attemptAutoUnlock(user.uid);
              }
            } else {
              console.warn("User document does not exist for UID:", user.uid);
              const skeletalUser: any = {
                  id: user.uid,
                  name: user.displayName || user.email?.split('@')[0] || 'Citizen',
                  email: user.email || '',
                  role: 'member',
                  status: 'active',
                  circle: 'GLOBAL',
                  isProfileComplete: true,
                  createdAt: Timestamp.now(),
              };
              setCurrentUser(skeletalUser);
            }
            setIsLoadingAuth(false);
            setIsAuthReady(true);
          }, (error) => {
            console.error("User document listener error:", error);
            setIsLoadingAuth(false);
            setIsAuthReady(true);
          });
        } else {
          setIsLoadingAuth(false);
          setIsAuthReady(true);
        }
        
        try {
            api.setupPresence(user.uid);
        } catch (presenceError) {
            console.error("Presence setup failed:", presenceError);
        }
      } else {
        setCurrentUser(null);
        setIsLoadingAuth(false);
        setIsAuthReady(true);
      }
    }, (error) => {
      console.error("Auth: onAuthStateChanged error:", error);
      setIsLoadingAuth(false);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (userDocListener) userDocListener();
    };
  }, [auth, db, addToast, attemptAutoUnlock]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsProcessingAuth(true);
    console.log("Starting login handshake for:", credentials.email);
    
    try {
      const user = await api.login(credentials.email, credentials.password);
      console.log("Firebase Auth success for UID:", user.uid);
      // Immediate state update for faster UI response
      setFirebaseUser(user);
      setIsLoadingAuth(false);
      setIsProcessingAuth(false);
    } catch (error: any) {
      setIsProcessingAuth(false); 
      console.error("Login error:", error);
      
      let errorMessage = error.message || 'Identity Handshake Failed';
      if (errorMessage.includes('network-request-failed') || errorMessage.includes('offline')) {
          errorMessage = "Connection failed. Please check your internet connection and try again.";
      }
      
      addToast(errorMessage, 'error');
      throw error;
    }
  }, [addToast]);

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
    if (!auth) {
        addToast("Auth not configured", "error");
        return;
    }
    setIsProcessingAuth(true);
    try {
        sessionStorage.setItem('ugc_guest_name', displayName);
        await signInAnonymously(auth);
    } catch (error: any) {
        setIsProcessingAuth(false);
        addToast("Bridge access failed.", "error");
    }
  }, [auth, addToast]);

  const logout = useCallback(async () => {
    if (currentUser) api.goOffline(currentUser.id);
    sessionStorage.removeItem('ugc_node_unlocked');
    sessionStorage.removeItem('ugc_temp_pin');
    sessionStorage.removeItem('ugc_guest_name');
    cryptoService.clearSession();
    await api.logout();
  }, [currentUser]);

  const signup = useCallback(async (memberData: NewPublicMemberData & { mnemonic?: string }, password: string) => {
    if (!auth) {
        addToast("Auth not configured", "error");
        return;
    }
    setIsProcessingAuth(true);
    console.log("Starting signup protocol for:", memberData.email);
    try {
        let user: FirebaseUser;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, memberData.email, password);
            user = userCredential.user;
            console.log("Firebase Auth: User created with UID:", user.uid);
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log("Firebase Auth: User already exists, attempting to recover session.");
                const loginCred = await signInWithEmailAndPassword(auth, memberData.email, password);
                user = loginCred.user;
            } else {
                throw authError;
            }
        }
        
        // Use provided mnemonic or generate one if missing
        const mnemonic = memberData.mnemonic || cryptoService.generateMnemonic();
        const keys = cryptoService.mnemonicToKeyPair(mnemonic);
        
        // Save vault locally using UID as the anchor (removing separate password need)
        await cryptoService.saveVault({ mnemonic, email: memberData.email }, user.uid);
        const encryptedVault = localStorage.getItem('gcn_encrypted_vault') || "";

        const db = getDbInstance();
        if (!db) throw new Error("Firestore not configured");
        const batch = writeBatch(db);
        let referrerId = '';
        if (memberData.referralCode) {
            try {
                const snapshot = await getDocs(query(collection(db, 'users'), where('referralCode', '==', memberData.referralCode), limit(1)));
                if (!snapshot.empty) referrerId = snapshot.docs[0].id;
            } catch (refErr) {
                console.warn("Referral lookup failed (ignoring):", refErr);
            }
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
            encryptedVault: encryptedVault,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
        }, { merge: true });

        batch.set(doc(db, 'users', user.uid, 'private', 'data'), {
            email: memberData.email,
            phone: '',
            address: '',
            id_card_number: '',
            mnemonic: mnemonic
        }, { merge: true });

        console.log("Firestore: Committing signup batch...");
        await batch.commit();
        console.log("Firestore: Signup batch committed.");
        
        try {
            await sendEmailVerification(user);
        } catch (emailErr) {
            console.warn("Email verification send failed:", emailErr);
        }
        
        sessionStorage.setItem('ugc_node_unlocked', 'true');
        setIsProcessingAuth(false);
        addToast("Account created successfully.", "success");
    } catch (error: any) {
        setIsProcessingAuth(false);
        console.error("Signup protocol failed:", error);
        addToast(error.message || "Signup failed.", 'error');
        throw error;
    }
  }, [addToast]);

  const restoreWallet = useCallback(async (mnemonic: string, email: string, password: string) => {
    if (!auth) {
        addToast("Auth not configured", "error");
        return;
    }
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

        // Save vault locally using UID as the anchor
        await cryptoService.saveVault({ mnemonic, email }, user);
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
    isAuthReady,
    login,
    loginWithGoogle,
    loginAnonymously,
    logout,
    signup,
    restoreWallet,
    sendPasswordReset,
    updateUser,
    refreshIdentity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
