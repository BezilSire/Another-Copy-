
import { getAdminDb } from '../services/firebaseAdmin.js';

async function checkLedger() {
    const db = getAdminDb();
    const ledgerSnap = await db.collection('ledger').get();
    console.log(`Total ledger entries: ${ledgerSnap.size}`);
    
    const mints = ledgerSnap.docs.filter((d: any) => d.data().type === 'SYSTEM_MINT');
    console.log(`System mints: ${mints.length}`);
    mints.forEach((m: any) => {
        console.log(`Mint: ${m.id}, Amount: ${m.data().amount}, Receiver: ${m.data().receiverId}`);
    });

    const coinbase = ledgerSnap.docs.filter((d: any) => d.data().type === 'COINBASE');
    console.log(`Coinbase transactions: ${coinbase.length}`);
    
    const users = await db.collection('users').get();
    let totalInitialStake = 0;
    users.forEach((u: any) => {
        totalInitialStake += (u.data().initialUbtStake || 0);
    });
    console.log(`Total Initial UBT Stake: ${totalInitialStake}`);
}

checkLedger().catch(console.error);
