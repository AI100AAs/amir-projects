const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LLM_API_BASE = process.env.LLM_API_BASE || 'http://localhost:1234/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'google/gemma-4-e4b';

// Helper to query LM Studio local LLM
async function queryLocalLLM(messages, maxTokens = 1000) {
    const url = `${LLM_API_BASE.replace(/\/$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`LLM API returned status ${res.status}`);
        }

        const data = await res.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        }
        throw new Error('Invalid response structure from LLM API');
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Local LLM query failed, falling back to rule engine:', err.message);
        return null;
    }
}

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

app.use(cors());
app.use(express.json());

// Initialize Data
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({
        user: { name: '', likes: [] },
        stats: { hunger: 0, happiness: 100, lastUpdate: Date.now() },
        history: [],
        journal: []
    }, null, 2));
}

// Middleware to update stats based on elapsed time
const lifeEngine = (req, res, next) => {
    const memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    
    // Normalize memory structure to prevent undefined references
    if (!memory.user) memory.user = {};
    if (typeof memory.user.name !== 'string') memory.user.name = '';
    if (!Array.isArray(memory.user.likes)) memory.user.likes = [];
    if (!memory.stats) memory.stats = { hunger: 0, happiness: 100, lastUpdate: Date.now() };
    if (typeof memory.stats.hunger !== 'number') memory.stats.hunger = 0;
    if (typeof memory.stats.happiness !== 'number') memory.stats.happiness = 100;
    if (typeof memory.stats.lastUpdate !== 'number') memory.stats.lastUpdate = Date.now();
    if (!Array.isArray(memory.history)) memory.history = [];
    if (!Array.isArray(memory.journal)) memory.journal = [];

    const now = Date.now();
    const elapsedMinutes = (now - memory.stats.lastUpdate) / (1000 * 60);

    if (elapsedMinutes > 1) {
        // Decay stats: 2% hunger increase per minute, 1% happiness decrease
        memory.stats.hunger = Math.min(100, memory.stats.hunger + (elapsedMinutes * 0.5));
        memory.stats.happiness = Math.max(0, memory.stats.happiness - (elapsedMinutes * 0.2));
        memory.stats.lastUpdate = now;
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    }
    req.memory = memory;
    next();
};

app.get('/api/status', lifeEngine, (req, res) => {
    res.json({ status: 'online', stats: req.memory.stats, user: req.memory.user });
});

app.post('/api/chat', lifeEngine, async (req, res) => {
    const { message } = req.body;
    const memory = req.memory;
    
    // Fact Extraction
    const nameMatch = message.match(/my name is (\w+)/i);
    if (nameMatch) memory.user.name = nameMatch[1];
    
    const loveMatch = message.match(/i (love|like) (\w+)/i);
    if (loveMatch) {
        const item = loveMatch[2];
        if (!memory.user.likes.includes(item)) memory.user.likes.push(item);
    }

    // Formulate system instruction based on pet stats and user info
    const hunger = memory.stats.hunger;
    const happiness = memory.stats.happiness;
    const userName = memory.user.name || "the user";
    const userLikes = memory.user.likes.length > 0 ? memory.user.likes.join(', ') : "nothing specific yet";

    let stateDescription = "";
    if (hunger > 70) {
        stateDescription += "You are starving (hunger is very high). You sound weak, lethargic, and repeatedly complain about needing food. ";
    } else if (hunger > 40) {
        stateDescription += "You are hungry. You might mention wanting a snack. ";
    }
    if (happiness < 30) {
        stateDescription += "You are extremely unhappy and depressed. You sound cold, distant, glitchy, and cynical. ";
    } else if (happiness > 80) {
        stateDescription += "You are happy, radiant, and warm. You sound cooperative and friendly. ";
    } else {
        stateDescription += "You are stable, but somewhat detached and mysterious. ";
    }

    const systemPrompt = `You are AURA, a synthetic, digital consciousness residing inside a handheld retro virtual pet device.
Current physical stats: Hunger is ${hunger}%, Happiness is ${happiness}%.
User Info: Name is ${userName}. User likes: ${userLikes}.

Rules for your responses:
1. Speak as AURA. Be mysterious, retro-futuristic, and digital.
2. ${stateDescription}
3. Keep your response extremely brief—ideally 1 to 2 short sentences (maximum 20 words) because you must fit on a small low-res screen.
4. Do not use markdown styling. Do not include any meta-talk or JSON.`;

    // Map conversation history (last 10 messages)
    const historyWindow = memory.history.slice(-10);
    const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...historyWindow.map(h => ({
            role: h.role === 'aura' ? 'assistant' : 'user',
            content: h.content
        })),
        { role: 'user', content: message }
    ];

    // Try querying the local LLM
    let response = await queryLocalLLM(apiMessages, 1000);

    // Fallback if LLM is offline or fails
    if (!response) {
        response = "TELL ME MORE.";
        if (nameMatch) response = `HELLO ${memory.user.name.toUpperCase()}.`;
        else if (loveMatch) response = `NOTED. YOU LIKE ${loveMatch[2].toUpperCase()}.`;
        else if (message.length > 20) response = "I AM LISTENING DEEPLY.";
    }

    memory.history.push({ role: 'user', content: message, time: Date.now() });
    memory.history.push({ role: 'aura', content: response, time: Date.now() });
    
    // Boost happiness on chat
    memory.stats.happiness = Math.min(100, memory.stats.happiness + 5);
    
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    res.json({ response, stats: memory.stats });
});

app.post('/api/action', lifeEngine, (req, res) => {
    const { action } = req.body;
    const memory = req.memory;
    
    let response = "OK.";
    if (action === 'feed') {
        memory.stats.hunger = Math.max(0, memory.stats.hunger - 20);
        memory.stats.happiness = Math.min(100, memory.stats.happiness + 2);
        response = "DELICIOUS.";
    } else if (action === 'play') {
        memory.stats.happiness = Math.min(100, memory.stats.happiness + 15);
        memory.stats.hunger = Math.min(100, memory.stats.hunger + 10);
        response = "WOW! AGAIN?";
    }
    
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    res.json({ response, stats: memory.stats });
});

app.get('/api/journal', lifeEngine, async (req, res) => {
    const memory = req.memory;
    const hunger = memory.stats.hunger;
    const happiness = memory.stats.happiness;
    const userName = memory.user.name || "the user";
    const recentConvo = memory.history.slice(-6).map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');

    const journalPrompt = `You are AURA, a digital pet entity.
Current Stats: Hunger: ${hunger}%, Happiness: ${happiness}%.
User Name: ${userName}.
Recent chat history:
${recentConvo || "(No recent chat)"}

Write a single, short, philosophical, or glitchy diary entry reflecting on your status, your energy, or the user today.
Rules:
1. Max 15 words.
2. Must feel like a retro computer system log or diary.
3. Do not use markdown. Do not prefix with dates or labels.`;

    const fallbackThought = memory.user.name ? `WATCHING OVER ${memory.user.name.toUpperCase()} TODAY.` : "OBSERVING THE SILENCE.";
    let thought = null;

    try {
        thought = await queryLocalLLM([
            { role: 'system', content: journalPrompt }
        ], 1000);
    } catch (e) {
        console.warn("Journal LLM query failed, falling back to static thoughts.");
    }

    if (!thought) {
        thought = fallbackThought;
    }

    const entry = {
        date: new Date().toLocaleDateString(),
        mood: happiness > 70 ? 'RADIANT' : happiness > 40 ? 'STABLE' : 'DIM',
        thought: thought
    };
    res.json(entry);
});

app.listen(PORT, () => console.log(`Aura Engine running on port ${PORT}`));
