import React, { useState, useEffect } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Assistant() {
  const { sensorData, settings } = useAppContext();
  const [messages, setMessages] = useState([
    { type: 'ai', text: "Hello! I'm Aura AI. I'm monitoring your environment. Everything looks fine right now, but let me know if you feel any symptoms." }
  ]);
  const [input, setInput] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Contextual initial message based on current data
  useEffect(() => {
    let warning = "";
    if (sensorData.pollen.status === 'High') warning = "I noticed pollen levels are high. Did you take your allergy medication?";
    else if (sensorData.aqi.status === 'Unhealthy') warning = "Air quality is quite poor. I recommend staying indoors with windows closed.";
    else if (sensorData.noise.status === 'Critical') warning = "The current environment is very loud. This might be overwhelming soon.";

    if (warning && messages.length === 1) {
      setMessages(prev => [...prev, { type: 'ai', text: warning }]);
    }
  }, [sensorData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = `You are Aura AI, an empathetic environmental health assistant. 
The user is currently experiencing these environmental conditions:
- Pollen: ${Math.round(sensorData.pollen.value)} (Status: ${sensorData.pollen.status})
- Air Quality: ${Math.round(sensorData.aqi.value)} (Status: ${sensorData.aqi.status})
- UV Index: ${sensorData.uv.value.toFixed(1)} (Status: ${sensorData.uv.status})
- Noise Level: ${Math.round(sensorData.noise.value)}dB (Status: ${sensorData.noise.status})

Keep your answers very brief, empathetic, and actionable. Do not use more than 2-3 short sentences.`;

      // We must use /v1/chat/completions but strictly avoid the "system" role, 
      // as Gemma models lack a system role template and will return blank strings.
      // We wrap the instructions and the user message into a single "user" message.
      const gemmaSafePrompt = `${systemPrompt}\n\nThe user says: "${userMessage}"`;

      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'user', content: gemmaSafePrompt }
          ],
          temperature: 0.7,
          max_tokens: 8192,
          stream: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log("Raw LLM Data:", data);

      let reply = "Received empty response from LMStudio.";
      if (data?.choices && data.choices.length > 0) {
        const msgContent = data.choices[0].message?.content;
        const textContent = data.choices[0].text;
        
        if (typeof msgContent === 'string') {
          reply = msgContent || "(Model returned a blank string)";
        } else if (typeof textContent === 'string') {
          reply = textContent || "(Model returned a blank text string)";
        }
      } else if (data?.error) {
        reply = `Error from LLM: ${data.error.message || JSON.stringify(data.error)}`;
      }

      setMessages(prev => [...prev, { type: 'ai', text: reply }]);
    } catch (err: any) {
      console.error("Fetch error details:", err);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        text: `Error connecting to LMStudio: ${err.message}. Please check browser console and ensure LMStudio CORS is enabled.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-container" style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`chat-bubble ${msg.type}`}
          >
            {msg.type === 'ai' && <Sparkles size={14} style={{ marginBottom: '8px' }} />}
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble ai" style={{ opacity: 0.7 }}>
            <Sparkles size={14} style={{ marginBottom: '8px' }} />
            Thinking...
          </div>
        )}
      </div>

      <form 
        onSubmit={handleSend} 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          marginTop: 'auto',
          background: 'var(--surface-color)',
          padding: '12px',
          borderRadius: '24px',
          border: '1px solid var(--border-color)'
        }}
      >
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aura about your health..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'white',
            outline: 'none',
            fontSize: '0.95rem'
          }}
        />
        <button 
          type="submit" 
          style={{ 
            background: 'var(--accent-ai)', 
            color: '#000', 
            border: 'none', 
            borderRadius: '50%', 
            width: '36px', 
            height: '36px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
