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
     * Used by Admin to push old Firebase transactions to GitHub.
     */
    syncLegacyToGitHub: async (onProgress: (log: string) => void) => {
        onProgress("> SCANNING_FIREBASE_LEDGER...");
        const firebaseTxs = await api.getPublicLedger(1000);
        onProgress(`> FOUND ${firebaseTxs.length} HISTORICAL BLOCKS.`);

        // 1. Get existing blocks on GitHub to avoid duplicates
        const listUrl = `${GITHUB_API}/repos/${REPO}/contents/ledger`;
        const listRes = await fetch(listUrl);
        const existingFiles = listRes.ok ? await listRes.json() : [];
        const existingIds = new Set(existingFiles.map((f: any) => {
            const match = f.name.match(/tx-\d+-(.+)\.json/);
            return match ? match[1] : '';
        }));

        let count = 0;
        for (const tx of firebaseTxs) {
            if (!existingIds.has(tx.id)) {
                onProgress(`> ANCHORING_BLOCK: ${tx.id.substring(0,8)}...`);
                await sovereignService.dispatchTransaction(tx);
                count++;
                // Small delay to prevent GitHub rate limiting
                await new Promise(r => setTimeout(r, 200));
            }
        }
        onProgress(`> SYNC_COMPLETE. ${count} BLOCKS RECONCILED.`);
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