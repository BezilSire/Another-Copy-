
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    serverTimestamp, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import { safeJsonStringify } from '../utils';
import { Simulation, SimAgent, SimMessage, User } from '../types';
import { agentService } from './agentService';

const simulationsCollection = collection(db, 'simulations');

export const simulationService = {
    /**
     * Step 1 & 2: Initialize Simulation and Create Agents
     */
    initializeSimulation: async (user: User, title: string, seedMaterial: string): Promise<string> => {
        const simDoc = await addDoc(simulationsCollection, {
            userId: user.id,
            title,
            seedMaterial,
            status: 'initializing',
            createdAt: serverTimestamp(),
            confidenceScore: 0,
            agentCount: 5
        });

        const simId = simDoc.id;

        try {
            const prompt = `
                Based on the following seed material for a Zimbabwean market simulation, generate 5 unique agent personas.
                Each persona should have a name, a background (local Zimbabwean context), and an initial stance on the topic.
                
                Seed Material: ${seedMaterial}
                
                Respond ONLY with a JSON object:
                {
                    "agents": [
                        { "name": "...", "background": "...", "initialStance": "..." }
                    ]
                }
            `;

            const response = await agentService.chat([
                { role: 'system', content: 'You are a simulation engine. Respond only in valid JSON.' },
                { role: 'user', content: prompt }
            ]);

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            const data = JSON.parse(jsonMatch[0]);
            const agents = data.agents;

            const agentsCollection = collection(db, `simulations/${simId}/agents`);
            for (const agentData of agents) {
                await addDoc(agentsCollection, {
                    ...agentData,
                    simulationId: simId,
                    currentStance: agentData.initialStance
                });
            }

            await updateDoc(doc(simulationsCollection, simId), { status: 'simulating' });
            return simId;

        } catch (error) {
            console.error("Simulation Initialization Error:", error);
            await updateDoc(doc(simulationsCollection, simId), { status: 'failed' });
            throw error;
        }
    },

    /**
     * Step 3: Run Simulation Step (Agents Interacting)
     */
    runSimulationStep: async (simId: string): Promise<void> => {
        const agentsSnap = await getDocs(collection(db, `simulations/${simId}/agents`));
        const agents = agentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SimAgent));
        
        const messagesSnap = await getDocs(query(
            collection(db, `simulations/${simId}/messages`),
            orderBy('timestamp', 'desc'),
            limit(10)
        ));
        const recentMessages = messagesSnap.docs.map(d => d.data() as SimMessage);

        const prompt = `
            Simulate a social interaction between Zimbabwean agents.
            Topic: ${simId}
            Agents: ${safeJsonStringify(agents.map(a => ({ name: a.name, background: a.background, stance: a.currentStance })))}
            Recent Conversation: ${safeJsonStringify(recentMessages.map(m => `${m.agentName}: ${m.content}`))}
            
            Generate 3 new interactions. Use local Zimbabwean context and slang.
            Respond ONLY with a JSON object:
            {
                "messages": [
                    { "agentName": "...", "content": "...", "platform": "ZIM_X" }
                ]
            }
        `;

        try {
            const response = await agentService.chat([
                { role: 'system', content: 'You are a social simulation engine. Respond only in valid JSON.' },
                { role: 'user', content: prompt }
            ]);

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            const data = JSON.parse(jsonMatch[0]);
            const messagesCollection = collection(db, `simulations/${simId}/messages`);
            
            for (const msg of data.messages) {
                const agent = agents.find(a => a.name === msg.agentName);
                await addDoc(messagesCollection, {
                    ...msg,
                    simulationId: simId,
                    agentId: agent?.id || 'unknown',
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Simulation Step Error:", error);
        }
    },

    /**
     * Step 4: Generate Final Report
     */
    generateFinalReport: async (simId: string): Promise<void> => {
        const simSnap = await getDocs(query(simulationsCollection, where('__name__', '==', simId)));
        if (simSnap.empty) return;
        const simData = simSnap.docs[0].data() as Simulation;
        
        const messagesSnap = await getDocs(collection(db, `simulations/${simId}/messages`));
        const allMessages = messagesSnap.docs.map(d => d.data() as SimMessage);

        const prompt = `
            Analyze this Zimbabwean market simulation and provide a profit strategy.
            Seed: ${simData.seedMaterial}
            Interactions: ${safeJsonStringify(allMessages.map(m => `${m.agentName}: ${m.content}`))}
            
            Respond ONLY with a JSON object:
            {
                "prediction": "...",
                "profitStrategy": "...",
                "confidenceScore": 85
            }
        `;

        try {
            const response = await agentService.chat([
                { role: 'system', content: 'You are a strategic analyst. Respond only in valid JSON.' },
                { role: 'user', content: prompt }
            ]);

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            const data = JSON.parse(jsonMatch[0]);
            await updateDoc(doc(simulationsCollection, simId), {
                ...data,
                status: 'completed',
                completedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Report Generation Error:", error);
            await updateDoc(doc(simulationsCollection, simId), { status: 'failed' });
        }
    },

    /**
     * Chat with the Oracle
     */
    chatWithOracle: async (simId: string, userMessage: string): Promise<string> => {
        const response = await agentService.chat([
            { role: 'system', content: 'You are the Guardian Oracle, a professional advisor for Zimbabwean businesses.' },
            { role: 'user', content: `Follow-up on simulation ${simId}: ${userMessage}` }
        ]);

        return response.choices[0].message.content || "I am currently processing your request.";
    }
};
