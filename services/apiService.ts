
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInAnonymously,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  or,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  FieldValue,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  DocumentSnapshot,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import {
    ref,
    onValue,
    set,
    onDisconnect,
    serverTimestamp as rtdbServerTimestamp
} from 'firebase/database';
import { getAuthInstance, getDbInstance, getRtdbInstance } from './firebase';
import { generateWelcomeMessage } from './geminiService';
import { sovereignService } from './sovereignService';
import { cryptoService } from './cryptoService';
import { safeJsonStringify } from '../utils';
import { 
    User, Member, MemberUser, Post,
    Notification, Activity,
    PublicUserProfile, PayoutRequest, Transaction, Admin, UbtTransaction, TreasuryVault, PendingUbtPurchase,
    CitizenResource, Dispute, GlobalEconomy, CommunityValuePool, Proposal, Venture, SustenanceCycle, SustenanceVoucher, Comment, Distribution, VentureEquityHolding,
    RedemptionCycle, Candidate, MultiSigProposal, UserVault, Report, Block
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const authInstance = getAuthInstance();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo: authInstance?.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', safeJsonStringify(errInfo));
  throw new Error(safeJsonStringify(errInfo));
}

const getDb = () => {
    const d = getDbInstance();
    if (!d) throw new Error("Firestore not configured");
    return d;
};

const getAuth = () => {
    const a = getAuthInstance();
    if (!a) throw new Error("Auth not configured");
    return a;
};

const getRtdb = () => {
    const r = getRtdbInstance();
    if (!r) throw new Error("RTDB not configured");
    return r;
};

const collections = {
    get users() { return collection(getDb(), 'users'); },
    get members() { return collection(getDb(), 'members'); },
    get posts() { return collection(getDb(), 'posts'); },
    get activity() { return collection(getDb(), 'activity'); },
    get proposals() { return collection(getDb(), 'proposals'); },
    get payouts() { return collection(getDb(), 'payouts'); },
    get vaults() { return collection(getDb(), 'treasury_vaults'); },
    get ledger() { return collection(getDb(), 'ledger'); },
    get resources() { return collection(getDb(), 'resources'); },
    get disputes() { return collection(getDb(), 'disputes'); },
    get globals() { return collection(getDb(), 'globals'); },
    get pendingPurchases() { return collection(getDb(), 'pending_ubt_purchases'); },
    get candidates() { return collection(getDb(), 'candidates'); },
    get broadcasts() { return collection(getDb(), 'broadcasts'); },
    get multisig() { return collection(getDb(), 'multisig_proposals'); },
    get blocks() { return collection(getDb(), 'blocks'); },
    get mempool() { return collection(getDb(), 'mempool'); },
    get zimPulse() { return collection(getDb(), 'zim_pulse'); },
};

const sanitizeDocId = (id: string) => id.replace(/\//g, '_');

const BLOCK_REWARD = 50;
const MIN_FEE = 0.01;

export const api = {
    handleFirestoreError,
    login: (email: string, password: string): Promise<FirebaseUser> => {
        return signInWithEmailAndPassword(getAuth(), email, password)
            .then(userCredential => userCredential.user);
    },
    loginAnonymously: (displayName: string): Promise<FirebaseUser> => {
        return signInAnonymously(getAuth())
            .then(userCredential => userCredential.user);
    },
    loginWithGoogle: (): Promise<FirebaseUser> => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(getAuth(), provider)
            .then(userCredential => userCredential.user);
    },
    logout: () => signOut(getAuth()),
    sendPasswordReset: (email: string) => sendPasswordResetEmail(getAuth(), email),
    sendEmailVerification: async () => {
        if (getAuth().currentUser) await sendEmailVerification(getAuth().currentUser!);
        else throw new Error("No user is currently signed in.");
    },
    setupPresence: (userId: string) => {
        const userStatusDatabaseRef = ref(getRtdb(), '/status/' + userId);
        const isOfflineForDatabase = { state: 'offline', last_changed: rtdbServerTimestamp() };
        const isOnlineForDatabase = { state: 'online', last_changed: rtdbServerTimestamp() };
        onValue(ref(getRtdb(), '.info/connected'), (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                set(userStatusDatabaseRef, isOnlineForDatabase);
            });
        });
    },
    goOffline: (userId: string) => set(ref(getRtdb(), '/status/' + userId), { state: 'offline', last_changed: rtdbServerTimestamp() }),

    getUser: async (uid: string): Promise<User> => {
        try {
            const userDoc = await getDoc(doc(getDb(), 'users', uid));
            if (!userDoc.exists()) throw new Error("User data not found.");
            return { id: userDoc.id, ...userDoc.data() } as User;
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${uid}`);
            throw error;
        }
    },
    getUserByEmail: async (email: string): Promise<User | null> => {
        const q = query(collections.users, where('email', '==', email), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    },
    getUserByPublicKey: async (publicKey: string): Promise<User | null> => {
        const q = query(collections.users, where('publicKey', '==', publicKey), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    },

    getLastTransactionHash: async (): Promise<string> => {
        const q = query(collections.ledger, orderBy('serverTimestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return 'GENESIS';
        return snapshot.docs[0].data().hash || 'GENESIS';
    },

    getLatestBlock: async (): Promise<Block | null> => {
        const q = query(collections.blocks, orderBy('index', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Block;
    },

    sendUbt: async (sender: User, receiverId: string, amount: number, memo: string) => {
        const nonce = cryptoService.generateNonce();
        const timestamp = Date.now();
        const fee = MIN_FEE;
        
        const txData = {
            senderId: sender.id,
            receiverId: receiverId,
            amount: amount,
            fee: fee,
            reason: memo,
            timestamp: timestamp,
            nonce: nonce,
            senderPublicKey: sender.publicKey || 'GENESIS',
            protocol_mode: 'MAINNET' as const,
            type: 'TRANSFER' as const
        };

        const payload = cryptoService.preparePayload(txData);
        const signature = cryptoService.signTransaction(payload);
        
        const transaction: UbtTransaction = {
            ...txData,
            id: `tx_${timestamp}_${nonce.substring(0, 8)}`,
            signature: signature,
            hash: await cryptoService.hashTransaction(txData),
            status: 'pending',
            parentHash: '' // Will be set when added to a block
        };

        // Validation
        const balanceMap = new Map<string, number>();
        balanceMap.set(sender.id, sender.ubtBalance || 0);
        const validation = await api.validateTransaction(transaction, balanceMap);
        if (!validation.valid) {
            throw new Error(validation.error || "INVALID_TRANSACTION");
        }

        await addDoc(collections.mempool, {
            ...transaction,
            participants: [sender.id, receiverId],
            serverTimestamp: serverTimestamp()
        });
        
        return transaction;
    },

    getDifficulty: async (lastBlock: Block | null): Promise<number> => {
        if (!lastBlock || lastBlock.index < 10) return 4;
        
        // Simple adjustment: fetch last 10 blocks to see average time
        const q = query(collections.blocks, orderBy('index', 'desc'), limit(10));
        const snap = await getDocs(q);
        const blocks = snap.docs.map(d => d.data() as Block);
        
        if (blocks.length < 10) return 4;
        
        const timeDiff = blocks[0].timestamp - blocks[blocks.length - 1].timestamp;
        const avgTime = timeDiff / (blocks.length - 1);
        
        const targetTime = 60000; // 1 minute per block
        
        if (avgTime < targetTime / 2) return lastBlock.difficulty + 1;
        if (avgTime > targetTime * 2) return Math.max(1, lastBlock.difficulty - 1);
        
        return lastBlock.difficulty;
    },

    validateTransaction: async (tx: UbtTransaction, currentBalances: Map<string, number>): Promise<{ valid: boolean; error?: string }> => {
        // 0. Basic Sanity
        if (tx.amount <= 0) return { valid: false, error: 'INVALID_AMOUNT' };
        if (tx.senderId === tx.receiverId) return { valid: false, error: 'SELF_TRANSFER_NOT_ALLOWED' };

        // 1. Basic Address Validation
        if (!tx.senderPublicKey || !tx.senderPublicKey.startsWith('UBT-') && tx.senderId !== 'SYSTEM' && !tx.senderId.startsWith('GENESIS')) {
            return { valid: false, error: 'INVALID_SENDER_ADDRESS' };
        }
        if (!tx.receiverId) {
            return { valid: false, error: 'INVALID_RECEIVER_ADDRESS' };
        }

        // 2. Signature Validation
        if (tx.type !== 'COINBASE' && tx.senderId !== 'SYSTEM' && !tx.senderId.startsWith('GENESIS') && tx.signature !== 'SYSTEM_SIG') {
            const payload = cryptoService.preparePayload(tx);
            const isValidSig = cryptoService.verifySignature(payload, tx.signature, tx.senderPublicKey);
            if (!isValidSig) return { valid: false, error: 'INVALID_SIGNATURE' };
        }

        // 3. Double Spending Check (Hash/Signature uniqueness in Ledger)
        const ledgerRef = doc(collections.ledger, sanitizeDocId(tx.signature || tx.id));
        const ledgerSnap = await getDoc(ledgerRef);
        if (ledgerSnap.exists()) {
            return { valid: false, error: 'TRANSACTION_ALREADY_MINED' };
        }

        // 4. Balance Validation
        if (tx.type !== 'COINBASE' && !['GENESIS', 'SYSTEM'].includes(tx.senderId)) {
            const senderBalance = currentBalances.get(tx.senderId) || 0;
            const totalCost = tx.amount + (tx.fee || 0);
            if (senderBalance < totalCost) {
                return { valid: false, error: 'INSUFFICIENT_FUNDS' };
            }
        }

        return { valid: true };
    },

    minePendingTransactions: async (minerId: string, onProgress?: (nonce: number) => void) => {
        const q = query(collections.mempool, orderBy('serverTimestamp', 'asc'), limit(50));
        const snapshot = await getDocs(q);
        
        const lastBlock = await api.getLatestBlock();
        const difficulty = await api.getDifficulty(lastBlock);
        
        let index = 0;
        let previousHash = '0'.repeat(64);
        if (lastBlock) {
            index = lastBlock.index + 1;
            previousHash = lastBlock.hash;
        }

        const mempoolTxs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
        
        // Fetch current balances for all participants to validate in-memory
        const participants = new Set<string>();
        mempoolTxs.forEach(tx => {
            participants.add(tx.senderId);
            participants.add(tx.receiverId);
        });
        participants.add('GENESIS'); // For block rewards
        participants.add(minerId);

        const balanceMap = new Map<string, number>();
        const participantArray = Array.from(participants);
        
        // Batch fetch balances
        for (let i = 0; i < participantArray.length; i += 10) {
            const chunk = participantArray.slice(i, i + 10);
            const userDocs = await api.getUsersByUids(chunk.filter(id => !['GENESIS', 'FLOAT', 'SYSTEM', 'DISTRESS', 'SUSTENANCE', 'VENTURE'].includes(id)));
            userDocs.forEach(u => balanceMap.set(u.id, u.ubtBalance || 0));
            
            const vaultDocs = await Promise.all(chunk.filter(id => ['GENESIS', 'FLOAT', 'SYSTEM', 'DISTRESS', 'SUSTENANCE', 'VENTURE'].includes(id)).map(id => getDoc(doc(collections.vaults, id))));
            vaultDocs.forEach(v => {
                if (v.exists()) balanceMap.set(v.id, v.data().balance || 0);
            });
        }

        // Validate transactions and filter valid ones
        const validTxs: UbtTransaction[] = [];
        for (const tx of mempoolTxs) {
            const result = await api.validateTransaction(tx, balanceMap);
            if (result.valid) {
                validTxs.push(tx);
                // Update local balance map for cumulative validation
                if (!['GENESIS', 'SYSTEM'].includes(tx.senderId)) {
                    const current = balanceMap.get(tx.senderId) || 0;
                    balanceMap.set(tx.senderId, current - (tx.amount + (tx.fee || 0)));
                }
                const currentRecv = balanceMap.get(tx.receiverId) || 0;
                balanceMap.set(tx.receiverId, currentRecv + tx.amount);
            } else {
                console.warn(`Transaction ${tx.id} failed validation: ${result.error}`);
                // Optionally remove invalid tx from mempool
                await deleteDoc(doc(collections.mempool, tx.id));
            }
        }

        if (validTxs.length === 0 && !lastBlock) {
            // If it's the first block and no txs, we might still want to mine a genesis block or wait
        }

        const totalFees = validTxs.reduce((sum, tx) => sum + (tx.fee || 0), 0);
        
        // Enforce 15M limit: Block reward comes from GENESIS
        const genesisBalance = balanceMap.get('GENESIS') || 0;
        const actualReward = Math.min(BLOCK_REWARD, genesisBalance);
        
        // Create Coinbase Transaction
        const coinbaseNonce = cryptoService.generateNonce();
        const coinbaseTimestamp = Date.now();
        const coinbaseTx: UbtTransaction = {
            id: `cb_${coinbaseTimestamp}_${coinbaseNonce.substring(0, 8)}`,
            senderId: 'GENESIS', // Reward comes from Genesis to maintain 15M cap
            receiverId: minerId,
            amount: actualReward + totalFees,
            timestamp: coinbaseTimestamp,
            nonce: coinbaseNonce,
            signature: 'COINBASE_SIG',
            hash: 'COINBASE_HASH',
            senderPublicKey: 'GENESIS_KEY',
            parentHash: previousHash,
            type: 'COINBASE',
            protocol_mode: 'MAINNET',
            status: 'verified',
            reason: `Block Reward (${actualReward}) + Fees (${totalFees}) for Block #${index}`
        };
        
        const transactions = [coinbaseTx, ...validTxs];
        
        const minedData = await cryptoService.mineBlock(index, previousHash, transactions, difficulty, onProgress);
        
        const newBlock: Block = {
            id: minedData.hash,
            index,
            timestamp: minedData.timestamp,
            transactions,
            merkleRoot: minedData.merkleRoot,
            previousHash,
            nonce: minedData.nonce,
            hash: minedData.hash,
            minerId,
            difficulty
        };

        await runTransaction(getDb(), async (t) => {
            t.set(doc(collections.blocks, newBlock.hash), {
                ...newBlock,
                serverTimestamp: serverTimestamp()
            });

            // Delete mined transactions from mempool
            validTxs.forEach(tx => {
                // Find the original doc in mempool to delete
                const mempoolDoc = snapshot.docs.find(d => d.data().id === tx.id);
                if (mempoolDoc) t.delete(mempoolDoc.ref);
            });

            for (const tx of transactions) {
                const isFloatSender = ['GENESIS', 'FLOAT', 'SYSTEM', 'DISTRESS', 'SUSTENANCE', 'VENTURE'].includes(tx.senderId);
                const isFloatReceiver = ['GENESIS', 'FLOAT', 'SYSTEM', 'DISTRESS', 'SUSTENANCE', 'VENTURE'].includes(tx.receiverId);
                
                const senderRef = isFloatSender ? doc(collections.vaults, tx.senderId) : doc(collections.users, tx.senderId);
                const receiverRef = isFloatReceiver ? doc(collections.vaults, tx.receiverId) : doc(collections.users, tx.receiverId);
                
                const balKey = isFloatSender ? 'balance' : 'ubtBalance';
                const recvBalKey = isFloatReceiver ? 'balance' : 'ubtBalance';

                // Update Balances
                if (tx.type !== 'COINBASE' && !isFloatSender) {
                    t.update(senderRef, { [balKey]: increment(-(tx.amount + (tx.fee || 0))) });
                } else if (tx.type === 'COINBASE') {
                    // Coinbase sender is GENESIS (vault)
                    t.update(senderRef, { balance: increment(-(tx.amount)) });
                }
                
                if (!isFloatReceiver) {
                    t.update(receiverRef, { [recvBalKey]: increment(tx.amount) });
                } else if (isFloatReceiver) {
                    t.update(receiverRef, { balance: increment(tx.amount) });
                }

                // Handle Vouch Logic
                if (tx.type === 'VOUCH_ANCHOR') {
                    t.update(receiverRef, { 
                        credibility_score: increment(5), 
                        vouchCount: increment(1) 
                    });
                }
                
                t.set(doc(collections.ledger, sanitizeDocId(tx.signature || tx.id)), {
                    ...tx,
                    status: 'verified',
                    blockHash: newBlock.hash,
                    participants: [tx.senderId, tx.receiverId],
                    serverTimestamp: serverTimestamp()
                });
            }
        });

        return newBlock;
    },

    validateBlock: async (block: Block, previousBlock: Block | null): Promise<boolean> => {
        // 1. Check index
        if (previousBlock && block.index !== previousBlock.index + 1) return false;
        if (!previousBlock && block.index !== 0) return false;

        // 2. Check previous hash
        if (previousBlock && block.previousHash !== previousBlock.hash) return false;
        if (!previousBlock && block.previousHash !== '0'.repeat(64)) return false;

        // 3. Check hash integrity
        const calculatedHash = await cryptoService.calculateBlockHash(
            block.index,
            block.previousHash,
            block.timestamp,
            block.merkleRoot,
            block.nonce
        );
        if (calculatedHash !== block.hash) return false;

        // 4. Check PoW
        const target = '0'.repeat(block.difficulty);
        if (!block.hash.startsWith(target)) return false;

        // 5. Check Merkle Root
        const calculatedMerkleRoot = await cryptoService.calculateMerkleRoot(block.transactions);
        if (calculatedMerkleRoot !== block.merkleRoot) return false;

        // 6. Validate Transactions
        const tempBalances = new Map<string, number>(); // This would ideally be the state at block start
        for (const tx of block.transactions) {
            if (tx.type === 'COINBASE') {
                if (tx.senderId !== 'GENESIS') return false; // Reward must come from Genesis
                continue;
            }
            const payload = cryptoService.preparePayload(tx);
            const isValid = cryptoService.verifySignature(payload, tx.signature, tx.senderPublicKey);
            if (!isValid) return false;

            // Basic check: sender and receiver must be different
            if (tx.senderId === tx.receiverId) return false;
            
            // Amount must be positive
            if (tx.amount <= 0) return false;
        }

        return true;
    },

    validateChain: async (): Promise<boolean> => {
        const q = query(collections.blocks, orderBy('index', 'asc'));
        const snapshot = await getDocs(q);
        const blocks = snapshot.docs.map(d => d.data() as Block);
        
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const previousBlock = i > 0 ? blocks[i - 1] : null;
            if (!(await api.validateBlock(block, previousBlock))) return false;
        }
        
        return true;
    },

    listenForMempool: (cb: (txs: UbtTransaction[]) => void): Unsubscribe => {
        return onSnapshot(query(collections.mempool, orderBy('serverTimestamp', 'desc')), s => {
            cb(s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction)));
        }, (e) => api.handleFirestoreError(e, OperationType.LIST, 'mempool'));
    },

    listenForBlocks: (cb: (blocks: Block[]) => void): Unsubscribe => {
        return onSnapshot(query(collections.blocks, orderBy('index', 'desc'), limit(20)), s => {
            cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Block)));
        }, (e) => api.handleFirestoreError(e, OperationType.LIST, 'blocks'));
    },

    listenForZimPulse: (cb: (activity: any[]) => void, err?: (error: any) => void): Unsubscribe => {
        const q = query(collections.zimPulse, orderBy('timestamp', 'desc'), limit(20));
        return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as any))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'zim_pulse')));
    },

    searchZimPulse: async (q: string, loc?: string) => {
        let baseQ = query(collections.zimPulse, orderBy('timestamp', 'desc'), limit(50));
        if (loc) {
            baseQ = query(collections.zimPulse, where('location', '==', loc), orderBy('timestamp', 'desc'), limit(50));
        }
        const s = await getDocs(baseQ);
        const results = s.docs.map(d => ({ id: d.id, ...d.data() } as any));
        if (q) {
            const lowerQ = q.toLowerCase();
            return results.filter(r => 
                (r.item && r.item.toLowerCase().includes(lowerQ)) || 
                (r.description && r.description.toLowerCase().includes(lowerQ))
            );
        }
        return results;
    },
    updateUser: async (uid: string, data: Partial<User>) => {
        const privateFields = ['email', 'phone', 'address', 'id_card_number'];
        const publicData: any = {};
        const privateData: any = {};
        
        Object.keys(data).forEach(key => {
            if (privateFields.includes(key)) {
                privateData[key] = (data as any)[key];
            } else {
                publicData[key] = (data as any)[key];
            }
        });

        const batch = writeBatch(getDb());
        if (Object.keys(publicData).length > 0) {
            batch.set(doc(getDb(), 'users', uid), publicData, { merge: true });
        }
        if (Object.keys(privateData).length > 0) {
            batch.set(doc(getDb(), 'users', uid, 'private', 'data'), privateData, { merge: true });
        }
        await batch.commit();
    },

    setRecoveryCommitment: async (uid: string, commitment: string) => {
        return updateDoc(doc(getDb(), 'users', uid), {
            recoveryCommitment: commitment,
            isKeyRotated: false
        });
    },

    rotateKey: async (uid: string, secret: string, newPublicKey: string) => {
        const userDoc = await getDoc(doc(getDb(), 'users', uid));
        if (!userDoc.exists()) throw new Error("USER_NOT_FOUND");
        
        const userData = userDoc.data() as User;
        if (!userData.recoveryCommitment) throw new Error("RECOVERY_NOT_SET");
        
        const hashedSecret = await cryptoService.hashRecoverySecret(secret);
        if (hashedSecret !== userData.recoveryCommitment) {
            throw new Error("INVALID_RECOVERY_SECRET");
        }
        
        // Rotate key and burn the commitment (one-time use)
        return updateDoc(doc(getDb(), 'users', uid), {
            publicKey: newPublicKey,
            isKeyRotated: true,
            recoveryCommitment: null // Burn it
        });
    },
    
    setUserStatus: (uid: string, status: User['status']) => updateDoc(doc(getDb(), 'users', uid), { status }),

    getPrivateData: async (uid: string): Promise<any> => {
        try {
            const privateDoc = await getDoc(doc(getDb(), 'users', uid, 'private', 'data'));
            if (!privateDoc.exists()) return null;
            return privateDoc.data();
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${uid}/private/data`);
            throw error;
        }
    },

    getUsersByUids: async (uids: string[]): Promise<User[]> => {
        if (uids.length === 0) return [];
        const results: User[] = [];
        for (let i = 0; i < uids.length; i += 10) {
            const chunk = uids.slice(i, i + 10);
            const q = query(collections.users, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        }
        return results;
    },

    processUbtTransaction: async (transaction: UbtTransaction) => {
        // Initial Validation before Mempool
        const balanceMap = new Map<string, number>();
        
        // Fetch sender balance for quick check
        if (!['GENESIS', 'SYSTEM'].includes(transaction.senderId)) {
            const sender = await api.getUser(transaction.senderId);
            balanceMap.set(transaction.senderId, sender.ubtBalance || 0);
        }

        const validation = await api.validateTransaction(transaction, balanceMap);
        if (!validation.valid) {
            throw new Error(validation.error || "INVALID_TRANSACTION");
        }

        // Add to Mempool for mining
        await addDoc(collections.mempool, {
            ...transaction,
            participants: [transaction.senderId, transaction.receiverId],
            serverTimestamp: serverTimestamp(),
            status: 'pending'
        });
        
        sovereignService.dispatchTransaction(transaction).catch(console.error);
    },

    getUserLedger: async (uid: string) => {
        try {
            const q = query(collections.ledger, 
                where('participants', 'array-contains', uid),
                limit(100)
            );
            const s = await getDocs(q);
            return s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction))
                .sort((a, b) => {
                    const timeA = a.serverTimestamp instanceof Timestamp ? a.serverTimestamp.toMillis() : (a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : (Number(a.timestamp) || 0));
                    const timeB = b.serverTimestamp instanceof Timestamp ? b.serverTimestamp.toMillis() : (b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : (Number(b.timestamp) || 0));
                    return timeB - timeA;
                });
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'ledger');
            throw error;
        }
    },

    syncInternalVaults: async (admin: Admin, from: TreasuryVault, to: TreasuryVault, amt: number, reason: string) => {
        const timestamp = Date.now();
        const nonce = `internal-${timestamp.toString(36)}`;
        const payload = `${from.id}:${to.id}:${amt}:${timestamp}:${nonce}`;
        const signature = `SIG_INTERNAL_${timestamp.toString(36)}`;
        
        const tx: UbtTransaction = { 
            id: signature, 
            senderId: from.id, 
            receiverId: to.id, 
            amount: amt, 
            timestamp: timestamp, 
            reason, 
            type: 'VAULT_SYNC', 
            protocol_mode: 'MAINNET', 
            senderPublicKey: from.publicKey, 
            receiverPublicKey: to.publicKey,
            nonce,
            signature,
            hash: payload,
            parentHash: '',
            status: 'pending'
        };
        
        // Validation
        const balanceMap = new Map<string, number>();
        balanceMap.set(from.id, from.balance || 0);
        const validation = await api.validateTransaction(tx, balanceMap);
        if (!validation.valid) {
            throw new Error(validation.error || "INVALID_VAULT_SYNC");
        }

        await addDoc(collections.mempool, { 
            ...tx, 
            participants: [from.id, to.id],
            serverTimestamp: serverTimestamp() 
        });
    },
    
    approveUbtPurchase: async (admin: Admin, p: PendingUbtPurchase, sourceVaultId: string, txData: Partial<UbtTransaction>) => {
        if (!txData.signature && !txData.id) throw new Error("CRYPTOGRAPHIC_ID_REQUIRED");

        const finalTx: UbtTransaction = {
            id: txData.id || txData.signature!,
            senderId: sourceVaultId,
            receiverId: p.userId,
            amount: p.amountUbt,
            timestamp: txData.timestamp || Date.now(),
            nonce: txData.nonce || "",
            signature: txData.signature || "",
            hash: txData.hash || "",
            senderPublicKey: admin.publicKey || "",
            parentHash: '',
            type: 'FIAT_BRIDGE',
            protocol_mode: 'MAINNET',
            status: 'pending'
        };

        // Validation
        const balanceMap = new Map<string, number>();
        const vaultDoc = await getDoc(doc(collections.vaults, sourceVaultId));
        if (vaultDoc.exists()) balanceMap.set(sourceVaultId, vaultDoc.data().balance || 0);
        
        const validation = await api.validateTransaction(finalTx, balanceMap);
        if (!validation.valid) {
            throw new Error(validation.error || "INVALID_BRIDGE_TRANSACTION");
        }

        await runTransaction(getDb(), async t => {
            const purchaseRef = doc(collections.pendingPurchases, p.id);
            const econRef = doc(collections.globals, 'economy');
            t.update(purchaseRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
            t.update(econRef, { cvp_usd_backing: increment(p.amountUsd) }); 
            
            t.set(doc(collections.mempool, finalTx.id), {
                ...finalTx,
                participants: [sourceVaultId, p.userId],
                serverTimestamp: serverTimestamp()
            });
        });
    },

    processAdminHandshake: async (vid: string, rid: string | null, amt: number, tx: UbtTransaction) => {
        // Protocol Protection: If rid is EXTERNAL_NODE but we have a receiverPublicKey, try to resolve it first
        let finalRid = rid;
        if (rid === 'EXTERNAL_NODE' && tx.receiverPublicKey && tx.receiverPublicKey.startsWith('UBT-')) {
            const resolved = await api.getUserByPublicKey(tx.receiverPublicKey);
            if (resolved) finalRid = resolved.id;
        }

        // Add to Mempool
        await addDoc(collections.mempool, {
            ...tx,
            receiverId: finalRid || 'EXTERNAL_NODE',
            participants: [vid, finalRid || 'EXTERNAL_NODE'],
            serverTimestamp: serverTimestamp(),
            status: 'pending'
        });
        
        sovereignService.dispatchTransaction(tx).catch(console.error);
    },

    updateUserUbt: async (admin: Admin, uid: string, amount: number, reason: string) => {
        const txId = `admin-${Date.now().toString(36)}`;
        const absAmount = Math.abs(amount);
        const isCredit = amount > 0;
        
        const tx: UbtTransaction = { 
            id: txId, 
            senderId: isCredit ? 'GENESIS' : uid, 
            receiverId: isCredit ? uid : 'GENESIS', 
            amount: absAmount, 
            timestamp: Date.now(), 
            reason, 
            type: isCredit ? 'credit' : 'debit', 
            protocol_mode: 'MAINNET', 
            nonce: cryptoService.generateNonce(),
            signature: 'SYSTEM_SIG',
            hash: 'SYSTEM_HASH',
            senderPublicKey: isCredit ? 'GENESIS_KEY' : 'USER_SIG_PLACEHOLDER', // Admin override
            parentHash: '',
            status: 'pending'
        };

        // Validation
        const balanceMap = new Map<string, number>();
        const sourceId = isCredit ? 'GENESIS' : uid;
        
        if (isCredit) {
            const genesisDoc = await getDoc(doc(collections.vaults, 'GENESIS'));
            if (genesisDoc.exists()) balanceMap.set('GENESIS', genesisDoc.data().balance || 0);
        } else {
            const userDoc = await getDoc(doc(collections.users, uid));
            if (userDoc.exists()) balanceMap.set(uid, userDoc.data().ubtBalance || 0);
        }
        
        // Admin transactions bypass signature check but must pass balance check
        const validation = await api.validateTransaction(tx, balanceMap);
        if (!validation.valid) {
            throw new Error(validation.error || "INVALID_ADMIN_TRANSACTION");
        }

        await addDoc(collections.mempool, {
            ...tx,
            participants: [tx.senderId, tx.receiverId],
            serverTimestamp: serverTimestamp()
        });
        
        sovereignService.dispatchTransaction(tx).catch(console.error);
    },

    getPublicLedger: async (l: number = 200) => {
        const s = await getDocs(query(collections.ledger, orderBy('serverTimestamp', 'desc'), limit(l)));
        return s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
    },

    getGroupMembers: async (uids: string[]): Promise<MemberUser[]> => {
        const users = await api.getUsersByUids(uids);
        return users as MemberUser[];
    },

    // Fix: Added resolveNodeIdentity for ledger page and admin dispatch
    resolveNodeIdentity: async (identifier: string): Promise<PublicUserProfile | null> => {
        if (!identifier) return null;
        try {
            const userDoc = await getDoc(doc(collections.users, identifier));
            if (userDoc.exists()) return { id: userDoc.id, ...userDoc.data() } as PublicUserProfile;
            const vaultDoc = await getDoc(doc(collections.vaults, identifier));
            if (vaultDoc.exists()) return { id: vaultDoc.id, name: vaultDoc.data()?.name, ubtBalance: vaultDoc.data()?.balance, role: 'admin', circle: 'TREASURY' } as any;
            
            // Search by publicKey if identifier is not an ID
            const q = query(collections.users, where('publicKey', '==', identifier), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as PublicUserProfile;
        } catch (e) {}
        return null;
    },

    // Fix: Added getPublicUserProfile for profile views
    getPublicUserProfile: async (uid: string): Promise<PublicUserProfile | null> => {
        const userDoc = await getDoc(doc(collections.users, uid));
        return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as PublicUserProfile : null;
    },

    // Fix: Added getPublicUserProfilesByUids for list views
    getPublicUserProfilesByUids: async (uids: string[]): Promise<PublicUserProfile[]> => {
        if (uids.length === 0) return [];
        const results: PublicUserProfile[] = [];
        for (let i = 0; i < uids.length; i += 10) {
            const chunk = uids.slice(i, i + 10);
            const q = query(collections.users, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile)));
        }
        return results;
    },

    reconcileAllBalances: async () => {
        const usersSnap = await getDocs(collections.users);
        const ledgerSnap = await getDocs(collections.ledger);
        const txs = ledgerSnap.docs.map(d => d.data() as UbtTransaction);
        
        const userMap = new Map<string, { balance: number, publicKey: string }>();
        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            userMap.set(doc.id, { 
                balance: Number(data.initialUbtStake || 0), 
                publicKey: data.publicKey || '' 
            });
        });

        // Single pass over ledger to calculate all balances
        txs.forEach(tx => {
            const amt = Number(tx.amount || 0);
            
            // Credit receiver
            if (userMap.has(tx.receiverId)) {
                userMap.get(tx.receiverId)!.balance += amt;
            } else if (tx.receiverPublicKey) {
                // Fallback: search by public key if receiverId didn't match
                for (const [uid, userData] of userMap.entries()) {
                    if (userData.publicKey === tx.receiverPublicKey) {
                        userData.balance += amt;
                        break;
                    }
                }
            }

            // Debit sender
            if (userMap.has(tx.senderId)) {
                userMap.get(tx.senderId)!.balance -= amt;
            } else if (tx.senderPublicKey) {
                for (const [uid, userData] of userMap.entries()) {
                    if (userData.publicKey === tx.senderPublicKey) {
                        userData.balance -= amt;
                        break;
                    }
                }
            }
        });

        const batch = writeBatch(getDb());
        userMap.forEach((data, uid) => {
            batch.update(doc(collections.users, uid), { ubtBalance: data.balance });
        });
        await batch.commit();
    },

    reconcileUserBalance: async (uid: string) => {
        const userDoc = await getDoc(doc(collections.users, uid));
        if (!userDoc.exists()) throw new Error("User not found");
        
        const userData = userDoc.data();
        const userPublicKey = userData.publicKey;
        const initialStake = Number(userData.initialUbtStake || 0);

        // Fetch all transactions where this user is either sender or receiver (by ID or Public Key)
        const q = query(collections.ledger, or(
            where('participants', 'array-contains', uid),
            where('senderId', '==', uid),
            where('receiverId', '==', uid),
            where('senderPublicKey', '==', userPublicKey),
            where('receiverPublicKey', '==', userPublicKey)
        ));
        
        const snapshot = await getDocs(q);
        let calculatedBalance = initialStake;
        
        snapshot.docs.forEach(d => {
            const tx = d.data() as UbtTransaction;
            const amt = Number(tx.amount || 0);
            
            const isReceiver = tx.receiverId === uid || (userPublicKey && tx.receiverPublicKey === userPublicKey);
            const isSender = tx.senderId === uid || (userPublicKey && tx.senderPublicKey === userPublicKey);

            if (isReceiver) calculatedBalance += amt;
            if (isSender) calculatedBalance -= amt;
        });

        await updateDoc(doc(collections.users, uid), { ubtBalance: calculatedBalance });
        return calculatedBalance;
    },

    // Fix: Added searchUsers for directory and dispatching
    searchUsers: async (queryStr: string, currentUser: User): Promise<PublicUserProfile[]> => {
        const q = query(collections.users, where('name_lowercase', '>=', queryStr.toLowerCase()), where('name_lowercase', '<=', queryStr.toLowerCase() + '\uf8ff'), limit(15));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile)).filter(u => u.id !== currentUser.id);
    },

    // Fix: Added rejectUbtPurchase for Oracle administration
    rejectUbtPurchase: (id: string) => updateDoc(doc(collections.pendingPurchases, id), { status: 'REJECTED' }),

    // Fix: Added governance candidacy methods
    applyForExecutive: async (candidateData: Omit<Candidate, 'id' | 'voteCount' | 'votes' | 'createdAt' | 'status'>) => {
        return addDoc(collections.candidates, {
            ...candidateData,
            voteCount: 0,
            votes: [],
            status: 'applying',
            createdAt: serverTimestamp()
        });
    },
    deleteCandidate: (candidateId: string) => deleteDoc(doc(collections.candidates, candidateId)),
    voteForCandidate: (candidateId: string, voterId: string) => runTransaction(getDb(), async t => {
        const ref = doc(collections.candidates, candidateId);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error("Candidate node lost.");
        const data = snap.data() as Candidate;
        if (data.votes.includes(voterId)) throw new Error("DUPLICATE_SIGNATURE");
        t.update(ref, { 
            votes: arrayUnion(voterId), 
            voteCount: increment(1),
            status: (data.voteCount || 0) + 1 >= 20 ? 'mandated' : 'applying'
        });
    }),
    listenForCandidates: (cb: (c: Candidate[]) => void): Unsubscribe => {
        return onSnapshot(query(collections.candidates, orderBy('voteCount', 'desc')), s => {
            cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
        }, (e) => api.handleFirestoreError(e, OperationType.LIST, 'candidates'));
    },

    listenForGlobalEconomy: (cb: (e: GlobalEconomy | null) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(doc(collections.globals, 'economy'), s => cb(s.exists() ? s.data() as GlobalEconomy : null), err || ((e) => api.handleFirestoreError(e, OperationType.GET, 'globals/economy'))),
    listenToVaults: (cb: (v: TreasuryVault[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(collections.vaults, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryVault))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'treasury_vaults'))),
    listenForNotifications: (uid: string, cb: (n: Notification[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collection(getDb(), 'users', uid, 'notifications'), orderBy('timestamp', 'desc'), limit(50)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Notification))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, `users/${uid}/notifications`))),
    listenForUserTransactions: (uid: string, cb: (txs: UbtTransaction[]) => void, err?: (error: any) => void): Unsubscribe => {
        const ledgerQuery = query(collections.ledger, where('participants', 'array-contains', uid), limit(50));
        const mempoolQuery = query(collections.mempool, where('participants', 'array-contains', uid), limit(50));

        let ledgerTxs: UbtTransaction[] = [];
        let mempoolTxs: UbtTransaction[] = [];

        const updateCallback = () => {
            const allTxs = [...mempoolTxs, ...ledgerTxs].sort((a, b) => {
                const timeA = a.serverTimestamp instanceof Timestamp ? a.serverTimestamp.toMillis() : (a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : (Number(a.timestamp) || 0));
                const timeB = b.serverTimestamp instanceof Timestamp ? b.serverTimestamp.toMillis() : (b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : (Number(b.timestamp) || 0));
                return timeB - timeA;
            });
            cb(allTxs);
        };

        const unsubLedger = onSnapshot(ledgerQuery, s => {
            ledgerTxs = s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
            updateCallback();
        }, err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'ledger')));

        const unsubMempool = onSnapshot(mempoolQuery, s => {
            mempoolTxs = s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction));
            updateCallback();
        }, err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'mempool')));

        return () => {
            unsubLedger();
            unsubMempool();
        };
    },
    listenToUserVaults: (uid: string, cb: (v: UserVault[]) => void): Unsubscribe => 
        onSnapshot(query(collection(getDb(), 'users', uid, 'vaults'), orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as UserVault))), (e) => api.handleFirestoreError(e, OperationType.LIST, `users/${uid}/vaults`)),
    listenForActivity: (circle: string, cb: (a: Activity[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.activity, where('causerCircle', '==', circle), orderBy('timestamp', 'desc'), limit(10)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Activity))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'activity'))),
    listenForAllUsers: (admin: User, cb: (u: User[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(collections.users, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as User))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'users'))),
    listenForAllMembers: (admin: User, cb: (m: Member[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(collections.members, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'members'))),
    listenForPendingMembers: (admin: User, cb: (m: Member[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.members, where('payment_status', '==', 'pending_verification')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Member))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'members'))),
    listenForReports: (admin: User, cb: (r: Report[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(collection(getDb(), 'reports'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'reports'))),
    listenForPayoutRequests: (admin: User, cb: (r: PayoutRequest[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(collections.payouts, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'payouts'))),
    listenForPendingPurchases: (cb: (p: PendingUbtPurchase[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.pendingPurchases, where('status', '==', 'PENDING')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PendingUbtPurchase))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'pending_ubt_purchases'))),
    listenForUserVentures: (uid: string, cb: (v: Venture[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collection(getDb(), 'ventures'), where('ownerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'ventures'))),
    listenForUserPayouts: (uid: string, cb: (p: PayoutRequest[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.payouts, where('userId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'payouts'))),
    listenForReferredUsers: (uid: string, cb: (u: PublicUserProfile[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.users, where('referrerId', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'users'))),
    listenForProposals: (cb: (p: Proposal[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.proposals, orderBy('createdAt', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Proposal))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'proposals'))),
    listenToResources: (circle: string, cb: (r: CitizenResource[]) => void): Unsubscribe => 
        onSnapshot(circle === 'ANY' ? collections.resources : query(collections.resources, where('circle', '==', circle)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as CitizenResource))), (e) => api.handleFirestoreError(e, OperationType.LIST, 'resources')),
    listenToTribunals: (cb: (d: Dispute[]) => void): Unsubscribe => 
        onSnapshot(query(collections.disputes, where('status', '==', 'TRIBUNAL')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Dispute))), (e) => api.handleFirestoreError(e, OperationType.LIST, 'disputes')),
    listenForVentures: (admin: User, cb: (v: Venture[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(collection(getDb(), 'ventures'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'ventures'))),
    listenForCVP: (admin: User, cb: (c: CommunityValuePool | null) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(doc(collections.globals, 'cvp'), s => cb(s.exists() ? { id: s.id, ...s.data() } as CommunityValuePool : null), err || ((e) => api.handleFirestoreError(e, OperationType.GET, 'globals/cvp'))),
    listenForFundraisingVentures: (cb: (v: Venture[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collection(getDb(), 'ventures'), where('status', '==', 'fundraising')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Venture))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'ventures'))),
    listenForPostsByAuthor: (authorId: string, cb: (posts: Post[]) => void, err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collections.posts, where('authorId', '==', authorId), orderBy('date', 'desc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Post))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, 'posts'))),
    listenForComments: (parentId: string, cb: (comments: Comment[]) => void, coll: 'posts' | 'proposals', err?: (error: any) => void): Unsubscribe => 
        onSnapshot(query(collection(getDb(), coll, parentId, 'comments'), orderBy('timestamp', 'asc')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment))), err || ((e) => api.handleFirestoreError(e, OperationType.LIST, `${coll}/${parentId}/comments`))),
    listenForMultiSigProposals: (cb: (p: MultiSigProposal[]) => void): Unsubscribe => 
        onSnapshot(query(collections.multisig, where('status', '==', 'pending')), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as MultiSigProposal))), (e) => api.handleFirestoreError(e, OperationType.LIST, 'multisig_proposals')),
    listenForPublicLedger: (cb: (txs: UbtTransaction[]) => void, l: number = 200): Unsubscribe => 
        onSnapshot(query(collections.ledger, orderBy('serverTimestamp', 'desc'), limit(l)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as UbtTransaction))), (e) => api.handleFirestoreError(e, OperationType.LIST, 'ledger')),

    initializeTreasury: async (admin: Admin) => {
        const genesisDoc = await getDoc(doc(collections.vaults, 'GENESIS'));
        if (genesisDoc.exists()) {
            console.log("Treasury already initialized.");
            return;
        }

        const batch = writeBatch(getDb());
        const vaults = [
            { id: 'GENESIS', name: 'Genesis Mother Node', type: 'GENESIS', balance: 15000000, description: 'Protocol asset root.' },
            { id: 'FLOAT', name: 'Social Float', type: 'FLOAT', balance: 0, description: 'Assets for peer exchange.' },
            { id: 'SUSTENANCE', name: 'Sustenance Reserve', type: 'SUSTENANCE', balance: 0, description: 'Dividend allocation node.' },
            { id: 'DISTRESS', name: 'Emergency Fund', type: 'DISTRESS', balance: 0, description: 'Social safety anchor.' },
            { id: 'VENTURE', name: 'Launchpad Treasury', type: 'VENTURE', balance: 0, description: 'Community growth capital.' }
        ];
        for (const v of vaults) {
            batch.set(doc(collections.vaults, v.id), { ...v, publicKey: `UBT-VAULT-${v.id}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, isLocked: false });
        }
        const txId = `mint-${Date.now().toString(36)}`;
        const tx: UbtTransaction = { 
            id: txId, 
            senderId: 'SYSTEM', 
            receiverId: 'GENESIS', 
            amount: 15000000, 
            timestamp: Date.now(), 
            nonce: 'SYSTEM_NONCE',
            signature: 'SYSTEM_SIG',
            hash: 'SYSTEM_HASH',
            senderPublicKey: 'ROOT_PROTOCOL', 
            parentHash: 'GENESIS_ROOT',
            type: 'SYSTEM_MINT', 
            protocol_mode: 'MAINNET', 
            status: 'verified'
        };
        batch.set(doc(collections.ledger, txId), {
            ...tx,
            participants: ['SYSTEM', 'GENESIS'],
            serverTimestamp: serverTimestamp() 
        });
        await batch.commit();
        sovereignService.dispatchTransaction(tx).catch(console.error);
    },
    toggleVaultLock: (id: string, lock: boolean) => updateDoc(doc(collections.vaults, id), { isLocked: lock }),
    registerResource: (data: Partial<CitizenResource>) => addDoc(collections.resources, { ...data, createdAt: serverTimestamp() }),

    createPost: async (u: User, content: string, type: Post['types'], award: number, skills: string[] = []) => {
        return addDoc(collections.posts, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content, date: new Date().toISOString(), upvotes: [], types: type, requiredSkills: skills, commentCount: 0, repostCount: 0, ccapAwarded: award });
    },
    deletePost: (id: string) => deleteDoc(doc(collections.posts, id)),
    updatePost: (id: string, content: string) => updateDoc(doc(collections.posts, id), { content }),
    upvotePost: async (id: string, uid: string) => {
        const snap = await getDoc(doc(collections.posts, id));
        if (snap.exists()) {
            const upvotes = snap.data().upvotes || [];
            await updateDoc(doc(collections.posts, id), { upvotes: upvotes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid) });
        }
    },
    fetchRegularPosts: async (count: number, filter: string, isAdmin: boolean, startAfterDoc?: DocumentSnapshot<DocumentData>, currentUser?: User) => {
        let q;
        if (filter === 'all' || filter === 'foryou') q = query(collections.posts, orderBy('date', 'desc'), limit(count));
        else if (filter === 'following' && currentUser?.following && currentUser.following.length > 0) q = query(collections.posts, where('authorId', 'in', currentUser.following), orderBy('date', 'desc'), limit(count));
        else q = query(collections.posts, where('types', '==', filter), orderBy('date', 'desc'), limit(count));
        if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
        const s = await getDocs(q);
        return { posts: s.docs.map(d => ({ id: d.id, ...d.data() } as Post)), lastVisible: s.docs[s.docs.length - 1] };
    },
    togglePinPost: (admin: User, id: string, pin: boolean) => updateDoc(doc(collections.posts, id), { isPinned: pin }),

    sendDistressPost: async (u: User, content: string) => {
        return addDoc(collections.posts, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content, date: new Date().toISOString(), upvotes: [], types: 'distress', commentCount: 0, repostCount: 0 });
    },

    createProposal: async (u: User, data: { title: string, description: string }) => {
        return addDoc(collections.proposals, { ...data, status: 'active', authorId: u.id, authorName: u.name, createdAt: serverTimestamp(), voteCountFor: 0, voteCountAgainst: 0, votesFor: [], votesAgainst: [] });
    },

    closeProposal: async (admin: User, pid: string, status: 'passed' | 'failed') => {
        return updateDoc(doc(collections.proposals, pid), { status });
    },

    getCommunityValuePool: async (): Promise<CommunityValuePool> => {
        const snap = await getDoc(doc(collections.globals, 'cvp'));
        if (!snap.exists()) throw new Error("CVP Offline");
        return { id: snap.id, ...snap.data() } as CommunityValuePool;
    },

    createVenture: async (v: any) => {
        return addDoc(collection(getDb(), 'ventures'), { ...v, status: 'fundraising', createdAt: serverTimestamp(), fundingRaisedCcap: 0, backers: [], totalSharesIssued: 0, totalProfitsDistributed: 0, ticker: `VEQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}` });
    },

    getProposal: async (pid: string): Promise<Proposal | null> => {
        const snap = await getDoc(doc(collections.proposals, pid));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Proposal : null;
    },

    getCurrentRedemptionCycle: async (): Promise<RedemptionCycle | null> => {
        const snap = await getDoc(doc(collections.globals, 'redemption_cycle'));
        return snap.exists() ? { id: snap.id, ...snap.data() } as RedemptionCycle : null;
    },

    performDailyCheckin: async (uid: string) => {
        return runTransaction(getDb(), async t => {
            const userRef = doc(collections.users, uid);
            const userSnap = await t.get(userRef);
            if (!userSnap.exists()) return;
            const lastCheckin = userSnap.data().lastDailyCheckin as Timestamp | undefined;
            if (lastCheckin && (Date.now() - lastCheckin.toMillis()) < 24 * 60 * 60 * 1000) throw new Error("Check-in blocked.");
            t.update(userRef, { scap: increment(10), lastDailyCheckin: serverTimestamp() });
        });
    },

    submitPriceVerification: async (uid: string, item: string, price: number, shop: string) => {
        const batch = writeBatch(getDb());
        batch.set(doc(collection(getDb(), 'price_verifications')), { userId: uid, item, price, shop, timestamp: serverTimestamp() });
        batch.update(doc(collections.users, uid), { ccap: increment(15) });
        return batch.commit();
    },

    updatePayoutStatus: async (admin: Admin, payout: PayoutRequest, status: 'completed' | 'rejected') => {
        return updateDoc(doc(collections.payouts, payout.id), { status, completedAt: serverTimestamp(), processedBy: { adminId: admin.id, adminName: admin.name } });
    },

    getVentureById: async (vid: string): Promise<Venture | null> => {
        const snap = await getDoc(doc(getDb(), 'ventures', vid));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Venture : null;
    },

    getDistributionsForUserInVenture: async (uid: string, vid: string, shares: number, totalShares: number): Promise<Distribution[]> => {
        const q = query(collection(getDb(), 'ventures', vid, 'distributions'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Distribution));
    },

    redeemCcapForCash: async (u: MemberUser, name: string, phone: string, amount: number, ccap: number, rate: number) => {
        const batch = writeBatch(getDb());
        batch.set(doc(collections.payouts), { userId: u.id, userName: u.name, type: 'ccap_redemption', amount, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp(), meta: { ccapRedeemed: ccap, rate } });
        batch.update(doc(collections.users, u.id), { ccap: increment(-ccap), lastCycleChoice: 'REDEEM' });
        return batch.commit();
    },

    stakeCcapForNextCycle: async (u: MemberUser) => {
        return updateDoc(doc(collections.users, u.id), { lastCycleChoice: 'STAKE' });
    },

    convertCcapToVeq: async (u: MemberUser, v: Venture, ccap: number, rate: number) => {
        const shares = Math.floor(ccap * 10);
        const holding: VentureEquityHolding = { ventureId: v.id, ventureName: v.name, ventureTicker: v.ticker, shares };
        const batch = writeBatch(getDb());
        batch.update(doc(collections.users, u.id), { ccap: increment(-ccap), lastCycleChoice: 'INVEST', ventureEquity: arrayUnion(holding) });
        batch.update(doc(getDb(), 'ventures', v.id), { fundingRaisedCcap: increment(ccap), backers: arrayUnion(u.id), totalSharesIssued: increment(shares) });
        return batch.commit();
    },

    getSustenanceFund: async (): Promise<SustenanceCycle | null> => {
        const snap = await getDoc(doc(collections.globals, 'sustenance'));
        return snap.exists() ? { id: snap.id, ...snap.data() } as SustenanceCycle : null;
    },

    getAllSustenanceVouchers: async (): Promise<SustenanceVoucher[]> => {
        const snap = await getDocs(collection(getDb(), 'vouchers'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as SustenanceVoucher));
    },

    initializeSustenanceFund: async (admin: User, balance: number, cost: number) => {
        return setDoc(doc(collections.globals, 'sustenance'), { slf_balance: balance, hamper_cost: cost, last_drop: serverTimestamp() });
    },

    runSustenanceLottery: async (admin: User) => {
        return { winners_count: 0 };
    },

    requestVeqPayout: async (u: User, h: VentureEquityHolding, shares: number, name: string, phone: string) => {
        return addDoc(collections.payouts, { userId: u.id, userName: u.name, type: 'veq_redemption', amount: shares, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp(), meta: { ventureId: h.ventureId, ventureName: h.ventureName } });
    },

    addFundsToCVP: async (u: User, amount: number) => {
        return updateDoc(doc(collections.globals, 'cvp'), { total_usd_value: increment(amount), last_updated: serverTimestamp() });
    },

    deleteVenture: async (u: User, vid: string) => {
        return deleteDoc(doc(getDb(), 'ventures', vid));
    },

    claimBonusPayout: async (pid: string, name: string, phone: string) => {
        return updateDoc(doc(collections.payouts, pid), { ecocashName: name, ecocashNumber: phone, status: 'pending' });
    },

    setGlobalEconomy: async (admin: Admin, data: Partial<GlobalEconomy>) => {
        return updateDoc(doc(collections.globals, 'economy'), data);
    },

    updateUbtRedemptionWindow: async (admin: Admin, open: boolean) => {
        const data: any = { ubtRedemptionWindowOpen: open };
        if (open) {
            data.ubtRedemptionWindowStartedAt = serverTimestamp();
            const closesAt = new Date();
            closesAt.setDate(closesAt.getDate() + 5);
            data.ubtRedemptionWindowClosesAt = Timestamp.fromDate(closesAt);
        }
        return updateDoc(doc(collections.globals, 'economy'), data);
    },

    requestUbtRedemption: async (u: User, amount: number, usd: number, name: string, phone: string) => {
        const batch = writeBatch(getDb());
        batch.set(doc(collections.payouts), { userId: u.id, userName: u.name, type: 'ccap_redemption', amount: usd, ecocashName: name, ecocashNumber: phone, status: 'pending', requestedAt: serverTimestamp(), meta: { ubtRedeemed: amount } });
        batch.update(doc(collections.users, u.id), { ubtBalance: increment(-amount) });
        return batch.commit();
    },

    requestOnchainWithdrawal: async (u: User, amount: number, address: string) => {
        const batch = writeBatch(getDb());
        batch.set(doc(collections.payouts), { userId: u.id, userName: u.name, type: 'onchain_withdrawal', amount, status: 'pending', requestedAt: serverTimestamp(), meta: { solanaAddress: address } });
        batch.update(doc(collections.users, u.id), { ubtBalance: increment(-amount) });
        return batch.commit();
    },

    deleteDistressPost: async (admin: User, pid: string, authorId: string) => {
        const batch = writeBatch(getDb());
        batch.delete(doc(collections.posts, pid));
        batch.update(doc(collections.users, authorId), { credibility_score: increment(-25) });
        return batch.commit();
    },

    reportPost: async (u: User, post: Post, reason: string, details: string) => {
        return addDoc(collection(getDb(), 'reports'), { reporterId: u.id, reporterName: u.name, reportedUserId: post.authorId, reportedUserName: post.authorName, postId: post.id, postContent: post.content, reason, details, date: new Date().toISOString(), status: 'new' });
    },

    repostPost: async (orig: Post, u: User, comment: string) => {
        return addDoc(collections.posts, { authorId: u.id, authorName: u.name, authorCircle: u.circle, authorRole: u.role, content: comment, date: new Date().toISOString(), upvotes: [], types: 'general', repostedFrom: orig, commentCount: 0, repostCount: 0 });
    },

    proposeMultiSigSync: (admin: Admin, from: TreasuryVault, to: TreasuryVault, amount: number, reason: string) => {
        return addDoc(collections.multisig, {
            fromVaultId: from.id,
            toVaultId: to.id,
            amount,
            reason,
            proposerId: admin.id,
            proposerName: admin.name,
            signatures: [admin.id],
            status: 'pending',
            timestamp: serverTimestamp()
        });
    },

    signMultiSigProposal: (adminId: string, proposalId: string) => runTransaction(getDb(), async t => {
        const ref = doc(collections.multisig, proposalId);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error("Proposal lost.");
        const data = snap.data() as MultiSigProposal;
        if (data.signatures.includes(adminId)) throw new Error("ALREADY_SIGNED");
        
        const newSigs = [...data.signatures, adminId];
        if (newSigs.length >= 2) {
            const fromRef = doc(collections.vaults, data.fromVaultId);
            const toRef = doc(collections.vaults, data.toVaultId);
            const fromSnap = await t.get(fromRef);
            if ((fromSnap.data()?.balance || 0) < data.amount) throw new Error("INSUFFICIENT_FUNDS_IN_VAULT");
            
            t.update(fromRef, { balance: increment(-data.amount) });
            t.update(toRef, { balance: increment(data.amount) });
            t.update(ref, { signatures: newSigs, status: 'executed' });
            
            const timestamp = Date.now();
            const txId = `multisig-exec-${timestamp.toString(36)}`;
            const tx: UbtTransaction = { 
                id: txId, 
                senderId: data.fromVaultId, 
                receiverId: data.toVaultId, 
                amount: data.amount, 
                timestamp: serverTimestamp(), 
                nonce: `MS-${timestamp}`,
                signature: `MS-SIG-${timestamp}`,
                hash: `MS-HASH-${timestamp}`,
                senderPublicKey: `VAULT-${data.fromVaultId}`,
                parentHash: 'MULTISIG_CHAIN',
                type: 'VAULT_SYNC', 
                protocol_mode: 'MAINNET', 
                reason: `MultiSig: ${data.reason}`, 
            };
            t.set(doc(collections.ledger, txId), {
                ...tx,
                participants: [data.fromVaultId, data.toVaultId],
                serverTimestamp: serverTimestamp() 
            });
            sovereignService.dispatchTransaction(tx).catch(console.error);
        } else {
            t.update(ref, { signatures: newSigs });
        }
    }),
    
    sendBroadcast: (u: User, m: string) => addDoc(collections.broadcasts, { authorId: u.id, authorName: u.name, message: m, date: new Date().toISOString() }),
    getNearbyUsers: async (uid: string) => {
        const snap = await getDocs(query(collections.users, limit(20)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => u.id !== uid);
    },
    getBroadcasts: async () => {
        const q = query(collections.broadcasts, orderBy('date', 'desc'), limit(10));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as any));
    },
    updateMemberAndUserProfile: async (uid: string, mid: string, uData: any, mData: any) => {
        const privateFields = ['email', 'phone', 'address', 'id_card_number'];
        const publicData: any = {};
        const privateData: any = {};
        
        Object.keys(uData).forEach(key => {
            if (privateFields.includes(key)) {
                privateData[key] = uData[key];
            } else {
                publicData[key] = uData[key];
            }
        });

        const batch = writeBatch(getDb());
        if (Object.keys(publicData).length > 0) {
            batch.update(doc(collections.users, uid), publicData);
        }
        if (Object.keys(privateData).length > 0) {
            batch.set(doc(getDb(), 'users', uid, 'private', 'data'), privateData, { merge: true });
        }
        batch.update(doc(collections.members, mid), mData);
        await batch.commit();
    },
    vouchForCitizen: async (transaction: UbtTransaction) => {
        // Validation
        const balanceMap = new Map<string, number>();
        const sender = await api.getUser(transaction.senderId);
        balanceMap.set(transaction.senderId, sender.ubtBalance || 0);

        const validation = await api.validateTransaction(transaction, balanceMap);
        if (!validation.valid) {
            throw new Error(validation.error || "INVALID_VOUCH_TRANSACTION");
        }

        // Add to Mempool
        await addDoc(collections.mempool, {
            ...transaction,
            participants: [transaction.senderId, transaction.receiverId],
            serverTimestamp: serverTimestamp(),
            status: 'pending'
        });
        sovereignService.dispatchTransaction(transaction).catch(console.error);
    },
    initiateDispute: (c: User, r: User, reason: string, evidence: string) => 
        addDoc(collections.disputes, { claimantId: c.id, claimantName: c.name, respondentId: r.id, respondentName: r.name, reason, evidence, status: 'TRIBUNAL', juryIds: [], votesForClaimant: 0, votesForRespondent: 0, signedVotes: {}, timestamp: serverTimestamp() }),
    castJuryVote: (did: string, uid: string, vote: string, signature: string) => 
        runTransaction(getDb(), async t => {
            const ref = doc(collections.disputes, did);
            const snap = await t.get(ref);
            if (!snap.exists()) return;
            t.update(ref, { 
                juryIds: arrayUnion(uid), 
                [`signedVotes.${uid}`]: signature, 
                [vote === 'claimant' ? 'votesForClaimant' : 'votesForRespondent']: increment(1) 
            });
        }),
    markNotificationAsRead: (uid: string, nid: string) => updateDoc(doc(getDb(), 'users', uid, 'notifications', nid), { read: true }),
    markAllNotificationsAsRead: async (uid: string) => {
        const q = query(collection(getDb(), 'users', uid, 'notifications'), where('read', '==', false));
        const s = await getDocs(q);
        const batch = writeBatch(getDb());
        s.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },
    awardKnowledgePoints: (uid: string) => updateDoc(doc(collections.users, uid), { hasReadKnowledgeBase: true, knowledgePoints: increment(10) }).then(() => true),
    
    requestPayout: (u: User, n: string, p: string, a: number) => {
        return addDoc(collections.payouts, { userId: u.id, userName: u.name, type: 'referral', amount: a, ecocashName: n, ecocashNumber: p, status: 'pending', requestedAt: serverTimestamp() });
    },
    
    addComment: (pid: string, data: any, coll: 'posts' | 'proposals') => {
        const batch = writeBatch(getDb());
        const commentRef = doc(collection(getDb(), coll, pid, 'comments'));
        batch.set(commentRef, { ...data, timestamp: serverTimestamp() });
        batch.update(doc(getDb(), coll, pid), { commentCount: increment(1) });
        return batch.commit();
    },

    deleteComment: (pid: string, cid: string, coll: 'posts' | 'proposals') => {
        const batch = writeBatch(getDb());
        batch.delete(doc(getDb(), coll, pid, 'comments', cid));
        batch.update(doc(getDb(), coll, pid), { commentCount: increment(-1) });
        return batch.commit();
    },

    upvoteComment: async (pid: string, cid: string, uid: string, coll: 'posts' | 'proposals' = 'posts') => {
        const ref = doc(getDb(), coll, pid, 'comments', cid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const upvotes = snap.data().upvotes || [];
            await updateDoc(ref, { upvotes: upvotes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid) });
        }
    },

    reportUser: (r: User, t: User, reason: string, details: string) => addDoc(collection(getDb(), 'reports'), { 
        reporterId: r.id, 
        reporterName: r.name, 
        reportedUserId: t.id, 
        reportedUserName: t.name, 
        reason, 
        details, 
        date: new Date().toISOString(), 
        status: 'new' 
    }),

    getVentureMembers: async (count: number) => {
        const q = query(collections.users, where('isLookingForPartners', '==', true), limit(count));
        const s = await getDocs(q);
        return { users: s.docs.map(d => ({ id: d.id, ...d.data() } as PublicUserProfile)) };
    },

    unfollowUser: async (uid: string, tid: string) => {
        const batch = writeBatch(getDb());
        batch.update(doc(collections.users, uid), { following: arrayRemove(tid) });
        batch.update(doc(collections.users, tid), { followers: arrayRemove(uid) });
        await batch.commit();
    },

    followUser: async (u: User, tid: string) => {
        const batch = writeBatch(getDb());
        batch.update(doc(collections.users, u.id), { following: arrayUnion(tid) });
        batch.update(doc(collections.users, tid), { followers: arrayUnion(u.id) });
        await batch.commit();
    },

    voteOnProposal: (pid: string, uid: string, v: 'for' | 'against') => runTransaction(getDb(), async t => {
        const ref = doc(collections.proposals, pid);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error("Proposal expired.");
        const data = snap.data();
        if (data?.votesFor?.includes(uid) || data?.votesAgainst?.includes(uid)) throw new Error("Identity already voted.");
        t.update(ref, { 
            [v === 'for' ? 'votesFor' : 'votesAgainst']: arrayUnion(uid), 
            [v === 'for' ? 'voteCountFor' : 'voteCountAgainst']: increment(1) 
        });
    }),

    getFundraisingVentures: async () => {
        const q = query(collection(getDb(), 'ventures'), where('status', '==', 'fundraising'));
        const s = await getDocs(q);
        return s.docs.map(d => ({ id: d.id, ...d.data() } as any));
    },

    createPendingUbtPurchase: (u: User, val: number, amt: number) => addDoc(collections.pendingPurchases, { 
        userId: u.id, 
        userName: u.name, 
        amountUsd: val, 
        amountUbt: amt, 
        status: 'PENDING', 
        createdAt: serverTimestamp(), 
        payment_method: 'FIAT' 
    }),

    updatePendingPurchaseReference: (purchaseId: string, ref: string) => updateDoc(doc(collections.pendingPurchases, purchaseId), { 
        ecocashRef: ref, 
        status: 'AWAITING_CONFIRMATION' 
    }),
    safeJsonStringify,
};
