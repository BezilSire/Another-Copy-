
import { getAdminDb, getAdminAuth } from './firebaseAdmin.js';
import { serverCryptoService } from './serverCryptoService.js';
import { FieldValue } from 'firebase-admin/firestore';

enum OperationType {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAdminAuth();
  // Note: Admin SDK doesn't have a 'currentUser' in the same way as Client SDK.
  // We'll just log the error with as much context as we have.
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'server-admin',
      email: 'server-admin@system.local',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error (Admin): ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const miningService = {
    minePendingTransactions: async (minerId: string) => {
        const db = getAdminDb();
        if (!db) return;
        console.log(`[Miner] Starting background mining for ${minerId}...`);

        try {
            // Fetch pending transactions from mempool
            const mempoolRef = db.collection('mempool');
            let mempoolSnap;
            try {
                mempoolSnap = await mempoolRef
                    .where('status', '==', 'pending')
                    .orderBy('serverTimestamp', 'asc')
                    .limit(25)
                    .get();
            } catch (error) {
                handleFirestoreError(error, OperationType.LIST, 'mempool');
                return;
            }

            if (mempoolSnap.empty) {
                return;
            }

            const pendingTxs = mempoolSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            console.log(`[Miner] Found ${pendingTxs.length} pending transactions.`);

            // Get last block to find parent hash
            const blocksRef = db.collection('blocks');
            let lastBlockSnap;
            try {
                lastBlockSnap = await blocksRef
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get();
            } catch (error) {
                handleFirestoreError(error, OperationType.LIST, 'blocks');
                return;
            }
            
            let parentHash = '0'.repeat(64);
            if (!lastBlockSnap.empty) {
                parentHash = lastBlockSnap.docs[0].id;
            }

            // Process transactions and update balances
            try {
                await db.runTransaction(async (t: any) => {
                    const validTxs: any[] = [];
                    let totalFees = 0;

                    for (const tx of pendingTxs as any[]) {
                        // Simple validation: check if sender has enough balance
                        let senderBalance = 0;
                        if (tx.senderId === 'GENESIS' || tx.senderId === 'SYSTEM' || tx.type === 'COINBASE') {
                            senderBalance = Infinity;
                        } else {
                            const senderDoc = await t.get(db.collection('users').doc(tx.senderId));
                            if (senderDoc.exists) {
                                senderBalance = senderDoc.data()?.ubtBalance || 0;
                            } else {
                                const vaultDoc = await t.get(db.collection('vaults').doc(tx.senderId));
                                if (vaultDoc.exists) {
                                    senderBalance = vaultDoc.data()?.balance || 0;
                                }
                            }
                        }

                        const totalCost = tx.amount + (tx.fee || 0);
                        if (senderBalance >= totalCost) {
                            validTxs.push(tx);
                            totalFees += (tx.fee || 0);

                            // Update balances
                            if (tx.senderId !== 'SYSTEM' && tx.senderId !== 'GENESIS' && tx.type !== 'COINBASE') {
                                const senderRef = db.collection('users').doc(tx.senderId);
                                const senderSnap = await t.get(senderRef);
                                if (senderSnap.exists) {
                                    t.update(senderRef, { ubtBalance: FieldValue.increment(-totalCost) });
                                } else {
                                    const vaultRef = db.collection('vaults').doc(tx.senderId);
                                    t.update(vaultRef, { balance: FieldValue.increment(-totalCost) });
                                }
                            } else if (tx.senderId === 'GENESIS') {
                                t.update(db.collection('vaults').doc('GENESIS'), { balance: FieldValue.increment(-totalCost) });
                            }

                            // Credit receiver
                            if (tx.receiverId !== 'SYSTEM') {
                                const receiverRef = db.collection('users').doc(tx.receiverId);
                                const receiverSnap = await t.get(receiverRef);
                                if (receiverSnap.exists) {
                                    t.update(receiverRef, { ubtBalance: FieldValue.increment(tx.amount) });
                                } else {
                                    const vaultRef = db.collection('vaults').doc(tx.receiverId);
                                    t.update(vaultRef, { balance: FieldValue.increment(tx.amount) });
                                }
                            }

                            // Credit GENESIS for the fee to maintain ledger integrity
                            if (tx.fee > 0) {
                                t.update(db.collection('vaults').doc('GENESIS'), { balance: FieldValue.increment(tx.fee) });
                            }

                            // Add to ledger
                            t.set(db.collection('ledger').doc(tx.id), {
                                ...tx,
                                status: 'verified',
                                serverTimestamp: FieldValue.serverTimestamp()
                            });

                            // Remove from mempool
                            t.delete(db.collection('mempool').doc(tx.id));
                        } else {
                            // Mark as failed in mempool
                            t.update(db.collection('mempool').doc(tx.id), { status: 'failed', error: 'INSUFFICIENT_FUNDS' });
                        }
                    }

                    if (validTxs.length === 0) return;

                    // Create Block Reward Transaction
                    const rewardAmt = 50 + totalFees;
                    const rewardTxId = `reward-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    const rewardTx = {
                        id: rewardTxId,
                        senderId: 'GENESIS',
                        receiverId: minerId,
                        amount: rewardAmt,
                        fee: 0,
                        timestamp: Date.now(),
                        type: 'COINBASE',
                        status: 'verified',
                        reason: 'Block Reward',
                        participants: ['GENESIS', minerId],
                        serverTimestamp: FieldValue.serverTimestamp()
                    };

                    // Credit Miner
                    const minerRef = db.collection('users').doc(minerId);
                    const minerSnap = await t.get(minerRef);
                    if (minerSnap.exists) {
                        t.update(minerRef, { ubtBalance: FieldValue.increment(rewardAmt) });
                    }
                    
                    // Debit Genesis for reward
                    t.update(db.collection('vaults').doc('GENESIS'), { balance: FieldValue.increment(-rewardAmt) });

                    // Add reward to ledger
                    t.set(db.collection('ledger').doc(rewardTxId), rewardTx);

                    // Create Block
                    const blockData = {
                        parentHash,
                        transactions: [...validTxs.map(tx => tx.id), rewardTxId],
                        minerId,
                        timestamp: Date.now(),
                        nonce: Math.floor(Math.random() * 1000000),
                        difficulty: 1
                    };
                    const blockHash = serverCryptoService.hashObject(blockData);
                    
                    t.set(db.collection('blocks').doc(blockHash), {
                        ...blockData,
                        hash: blockHash
                    });

                    console.log(`[Miner] Successfully mined block ${blockHash} with ${validTxs.length} transactions.`);
                });
            } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, 'transaction');
            }

        } catch (error) {
            console.error(`[Miner] Mining error:`, error);
        }
    }
};
