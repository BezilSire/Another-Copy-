
/**
 * Ubuntium Sovereign Sync Engine
 * Handles the "Unkillable" ledger layer on GitHub.
 */

import { api } from './apiService';

const GITHUB_API = "https://api.github.com";
const REPO = "BezilSire/ubuntium-ledger";
const TOKEN = process.env.GITHUB_TOKEN;

// SYSTEM BLACKLIST: Signatures that should never be processed or displayed
const BLACKLISTED_SIGNATURES = ['mint-1766424900145'];

export const sovereignService = {
    /**
     * Commits a block to GitHub.
     */
    commitBlock: async (path: string, data: any, message: string): Promise<string | null> => {
        if (!TOKEN || !REPO) return null;
        if (BLACKLISTED_SIGNATURES.includes(data.id)) return null;

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
        if (BLACKLISTED_SIGNATURES.includes(tx.id)) return null;
        
        // Enrichment Protocol: Ensure packets contain maximum audit details
        let enrichedPacket = { ...tx };
        
        // Map System Nodes for the public layer
        const sysNodes = ['FLOAT', 'GENESIS', 'SYSTEM', 'SUSTENANCE', 'DISTRESS', 'VENTURE'];
        if (sysNodes.includes(tx.receiverId)) enrichedPacket.receiverPublicKey = `${tx.receiverId}_NODE`;
        if (sysNodes.includes(tx.senderId)) enrichedPacket.senderPublicKey = `${tx.senderId}_NODE`;

        const path = `ledger/tx-${tx.timestamp || Date.now()}-${tx.id}.json`;
        return await sovereignService.commitBlock(path, enrichedPacket, `Block Dispatch: ${tx.id}`);
    },

    /**
     * SOVEREIGN RECONCILIATION
     */
    syncLegacyToGitHub: async (onProgress: (log: string) => void) => {
        onProgress("> INITIALIZING_SOVEREIGN_MIRROR...");
        const firebaseTxs = await api.getPublicLedger(1000);
        
        onProgress(`> BUFFERED ${firebaseTxs.length} CANDIDATE BLOCKS.`);

        const listUrl = `${GITHUB_API}/repos/${REPO}/contents/ledger`;
        const listRes = await fetch(listUrl);
        const existingFiles = listRes.ok ? await listRes.json() : [];
        const existingIds = new Set(existingFiles.map((f: any) => {
            const match = f.name.match(/tx-\d+-(.+)\.json/);
            return match ? match[1] : '';
        }));

        let count = 0;
        for (const tx of firebaseTxs) {
            if (BLACKLISTED_SIGNATURES.includes(tx.id)) continue;
            
            if (!existingIds.has(tx.id)) {
                let enrichedTx = { ...tx };
                
                // CRITICAL: Identity resolution protocol
                try {
                    if (!enrichedTx.receiverPublicKey && tx.receiverId.length > 10) {
                        const receiverProfile = await api.getPublicUserProfile(tx.receiverId);
                        if (receiverProfile?.publicKey) {
                            enrichedTx.receiverPublicKey = receiverProfile.publicKey;
                        }
                    }
                    if (!enrichedTx.senderPublicKey && tx.senderId.length > 10) {
                        const senderProfile = await api.getPublicUserProfile(tx.senderId);
                        if (senderProfile?.publicKey) {
                            enrichedTx.senderPublicKey = senderProfile.publicKey;
                        }
                    }

                    const sysNodes = ['FLOAT', 'GENESIS', 'SYSTEM', 'SUSTENANCE', 'DISTRESS', 'VENTURE'];
                    if (sysNodes.includes(tx.receiverId)) enrichedTx.receiverPublicKey = `${tx.receiverId}_NODE`;
                    if (sysNodes.includes(tx.senderId)) enrichedTx.senderPublicKey = `${tx.senderId}_NODE`;

                } catch (e) {}

                onProgress(`> ANCHORING_BLOCK: ${tx.id.substring(0,8)}...`);
                await sovereignService.dispatchTransaction(enrichedTx);
                count++;
                await new Promise(r => setTimeout(r, 50));
            }
        }
        onProgress(`> SYNC_COMPLETE. ${count} NEW BLOCKS ANCHORED.`);
    },

    fetchPublicLedger: async (limitCount: number = 200): Promise<any[]> => {
        try {
            const listUrl = `${GITHUB_API}/repos/${REPO}/contents/ledger`;
            const listRes = await fetch(listUrl, { 
                cache: 'no-store',
                headers: TOKEN ? { "Authorization": `Bearer ${TOKEN}` } : {} 
            });
            
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

            const results = await Promise.all(txPromises);
            
            return results
                .filter(tx => !BLACKLISTED_SIGNATURES.includes(tx.id))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } catch (e) {
            console.error("Public Ledger Fetch Failed:", e);
            return [];
        }
    }
};
