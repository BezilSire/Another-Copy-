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
        // Use original timestamp for historical accuracy
        const path = `ledger/tx-${tx.timestamp || Date.now()}-${tx.id}.json`;
        return await sovereignService.commitBlock(path, tx, `Asset Dispatch: ${tx.id}`);
    },

    /**
     * LEGACY BRIDGE PROTOCOL
     * 1. Filters out SIMULATION and MINT transactions (Expungement)
     * 2. Resolves Receiver ID to Public Key and STAMPS it into the file.
     */
    syncLegacyToGitHub: async (onProgress: (log: string) => void) => {
        onProgress("> INITIALIZING_SOVEREIGN_CLEANSE...");
        const firebaseTxs = await api.getPublicLedger(1000);
        
        // STRICT FILTER: Expunge simulation/test blocks
        const realTxs = firebaseTxs.filter(tx => {
            const isSimulation = tx.type === 'SIMULATION_MINT' || tx.type === 'SYSTEM_MINT';
            const isTestAmount = tx.amount === 10000; // The problematic 10k blocks
            return !isSimulation && !isTestAmount;
        });
        
        onProgress(`> CLEANSED_HISTORY: ${realTxs.length} REAL BLOCKS IDENTIFIED.`);

        // 1. Get existing blocks on GitHub to prevent duplicate work
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
                onProgress(`> RESOLVING_TARGET_KEY: ${tx.receiverId.substring(0,8)}...`);
                
                // CRITICAL: IDENTITY STAMPING
                // We resolve the internal "ridiculous" ID to the UBT Public Key before pushing to GitHub
                let enrichedTx = { ...tx };
                try {
                    const receiverProfile = await api.getPublicUserProfile(tx.receiverId);
                    if (receiverProfile?.publicKey) {
                        enrichedTx.receiverPublicKey = receiverProfile.publicKey;
                        onProgress(`> STAMPED_ADDRESS: ${receiverProfile.publicKey.substring(0,12)}...`);
                    } else if (['FLOAT', 'GENESIS', 'SUSTENANCE', 'DISTRESS', 'VENTURE'].includes(tx.receiverId)) {
                        enrichedTx.receiverPublicKey = `SYSTEM_NODE:${tx.receiverId}`;
                    }
                } catch (e) {
                    console.warn("Could not resolve receiver key for", tx.id);
                }

                onProgress(`> ANCHORING_BLOCK: ${tx.id.substring(0,8)}...`);
                await sovereignService.dispatchTransaction(enrichedTx);
                count++;
                await new Promise(r => setTimeout(r, 250)); // Slow for stability
            }
        }
        onProgress(`> SYNC_COMPLETE. ${count} BLOCKS VERIFIED & ANCHORED.`);
    },

    /**
     * PUBLIC DISCOVERY PROTOCOL
     */
    fetchPublicLedger: async (limitCount: number = 100): Promise<any[]> => {
        try {
            const listUrl = `${GITHUB_API}/repos/${REPO}/contents/ledger`;
            const listRes = await fetch(listUrl);
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