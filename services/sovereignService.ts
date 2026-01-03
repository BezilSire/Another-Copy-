
/**
 * Ubuntium Sovereign Sync Engine
 * Handles the "Unkillable" ledger layer on GitHub and IPFS.
 */

const GITHUB_API = "https://api.github.com";
const REPO = process.env.GITHUB_REPO || "BezilSire/ubuntium-ledger";
const TOKEN = process.env.GITHUB_TOKEN;

export const sovereignService = {
    /**
     * Commits a block (transaction or identity update) to the GitHub repo.
     * Every block is stored as a unique JSON file to prevent merge conflicts.
     */
    commitBlock: async (path: string, data: any, message: string): Promise<string | null> => {
        if (!TOKEN || !REPO) {
            console.warn("SOVEREIGN_ENGINE: Access keys missing. Ledger sync bypass active.");
            return null;
        }

        try {
            const content = btoa(JSON.stringify(data, null, 2));
            const url = `${GITHUB_API}/repos/${REPO}/contents/${path}`;

            // Check if file already exists (unlikely given hashes, but safe)
            let sha: string | null = null;
            try {
                const checkRes = await fetch(url, {
                    headers: { "Authorization": `token ${TOKEN}` }
                });
                if (checkRes.ok) {
                    const existing = await checkRes.json();
                    sha = existing.sha;
                }
            } catch (e) {}

            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `[PROTOCOL] ${message}`,
                    content: content,
                    sha: sha || undefined
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "GitHub API Error");
            }

            const json = await res.json();
            console.log(`LEDGER_SYNC: Block anchored at ${json.content.path}`);
            return json.content.html_url;

        } catch (error) {
            console.error("SOVEREIGN_ENGINE_FAIL:", error);
            throw error;
        }
    },

    /**
     * Dispatch a financial transaction to the sovereign layer.
     */
    dispatchTransaction: async (tx: any): Promise<string | null> => {
        const path = `ledger/tx-${tx.id}.json`;
        return await sovereignService.commitBlock(path, tx, `Asset Dispatch: ${tx.id}`);
    },

    /**
     * Backup an identity anchor to the sovereign layer.
     */
    dispatchIdentity: async (userId: string, data: any): Promise<string | null> => {
        const path = `citizens/node-${userId}.json`;
        return await sovereignService.commitBlock(path, data, `Identity Anchor: ${userId}`);
    }
};
