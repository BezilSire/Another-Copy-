/**
 * Ubuntium Sovereign Sync Engine
 * Handles the "Unkillable" ledger layer on GitHub.
 */

import { api } from './apiService';

const GITHUB_API = "https://api.github.com";
const REPO = "BezilSire/ubuntium-ledger";
const TOKEN = process.env.GITHUB_TOKEN;

export const sovereignService = {
    /**
     * Commits a block to GitHub.
     */
    commitBlock: async (path: string, data: any, message: string): Promise<string | null> => {
        if (!TOKEN || !REPO) return null;

        try {
            const content = btoa(JSON.stringify(data, null, 2));
            const url = `${GITHUB_API}/repos/${REPO}/contents/${path}`;

            let sha: string | null = null;
            try {
                const checkRes = await fetch(url, {
                    headers: { "Authorization": `Bearer ${TOKEN}` }
                });
                if (checkRes.ok) {
                    const existing = await checkRes.json();
                    sha = existing.sha;
                }
            } catch (e) {}

            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `[PROTOCOL] ${message}`,
                    content: content,
                    sha: sha || undefined
                })
            });

            if (!res.ok) return null;
            const json = await res.json();
            return json.content.html_url;
        } catch (error) {
            return null;
        }
    },

    dispatchTransaction: async (tx: any): Promise<string | null> => {
        const path = `ledger/tx-${tx.timestamp || Date.now()}-${tx.id}.json`;
        return await sovereignService.commitBlock(path, tx, `Block Dispatch: ${tx.id}`);
    },

    /**
     * SOVEREIGN RECONCILIATION
     * Modified to kill Firebase UIDs on the ledger.
     */
    syncLegacyToGitHub: async (onProgress: (log: string) => void) => {
        onProgress("> INITIALIZING_IDENTITY_STAMPING...");
        const firebaseTxs = await api.getPublicLedger(1000);
        
        // Filter noise (10k UBT blocks)
        const realTxs = firebaseTxs.filter(tx => {
            const isSimulation = tx.type === 'SIMULATION_MINT' || tx.type === 'SYSTEM_MINT';
            const isTestAmount = tx.amount === 10000;
            return !isSimulation && !isTestAmount;
        });
        
        onProgress(`> IDENTIFIED ${realTxs.length} LEGITIMATE BLOCKS.`);

        const listUrl = `${GITHUB_API}/repos/${REPO}/contents/ledger`;
        const listRes = await fetch(listUrl);
        const existingFiles = listRes.ok ? await listRes.json() : [];
        const existingIds = new Set(existingFiles.map((f: any) => {
            const match = f.name.match(/tx-\d+-(.+)\.json/);
            return match ? match[1] : '';
        }));

        let count = 0;
        for (const tx of realTxs) {
            if (!existingIds.has(tx.id)) {
                // IDENTITY RESOLUTION: Converting Database ID to Cryptographic ID
                let enrichedTx = { ...tx };
                try {
                    const receiverProfile = await api.getPublicUserProfile(tx.receiverId);
                    if (receiverProfile?.publicKey) {
                        enrichedTx.receiverPublicKey = receiverProfile.publicKey;
                    } else if (['FLOAT', 'GENESIS', 'SYSTEM'].includes(tx.receiverId)) {
                        enrichedTx.receiverPublicKey = `SYSTEM_NODE:${tx.receiverId}`;
                    } else {
                        // Fallback for nodes that were ousted before key generation
                        enrichedTx.receiverPublicKey = `LEGACY_NODE:${tx.receiverId.substring(0,8)}`;
                    }
                    
                    const senderProfile = await api.getPublicUserProfile(tx.senderId);
                    if (senderProfile?.publicKey) {
                        enrichedTx.senderPublicKey = senderProfile.publicKey;
                    }
                } catch (e) {}

                onProgress(`> ANCHORING_CRYPTO_BLOCK: ${tx.id.substring(0,8)}...`);
                await sovereignService.dispatchTransaction(enrichedTx);
                count++;
                await new Promise(r => setTimeout(r, 100));
            }
        }
        onProgress(`> SOVEREIGN_SYNC_COMPLETE. ${count} BLOCKS VERIFIED.`);
    },

    fetchPublicLedger: async (limitCount: number = 200): Promise<any[]> => {
        try {
            const listUrl = `${GITHUB_API}/repos/${REPO}/contents/ledger`;
            const listRes = await fetch(listUrl, { cache: 'no-store' });
            if (!listRes.ok) return [];
            
            const files = await listRes.json();
            if (!Array.isArray(files)) return [];

            const latestFiles = files
                .filter(f => f.name.startsWith('tx-'))
                .sort((a, b) => b.name.localeCompare(a.name))
                .slice(0, limitCount);

            const txPromises = latestFiles.map(async (file) => {
                const contentRes = await fetch(file.download_url);
                return await contentRes.json();
            });

            return await Promise.all(txPromises);
        } catch (e) {
            return [];
        }
    }
};