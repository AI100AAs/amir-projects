import React, { useEffect, useRef, useState } from "react";
import { chatCoach } from "../lib/coach.js";

// Reusable streaming chat with the coach. `snapshot()` (optional) returns a
// data URL to attach the current webcam frame for a form check.
export default function CoachChat({ profile, model, snapshot, fast = true, height = 420 }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I'm your coach. Ask me anything — exercise swaps, how a movement should feel, nutrition basics, or tap 📷 to have me check your form." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(withImage = false) {
    const text = input.trim();
    if ((!text && !withImage) || busy) return;
    const image = withImage && snapshot ? snapshot() : null;
    const userMsg = { role: "user", content: text || "How's my form in this photo?" };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      await chatCoach(
        { history, profile, model, image, fast },
        (delta) => {
          setMessages((m) => {
            const copy = m.slice();
            copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + delta };
            return copy;
          });
        },
        abortRef.current.signal,
      );
    } catch (e) {
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: "assistant", content: "⚠ " + (e.message || "Coach unavailable.") };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef} style={{ maxHeight: height }}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content || (busy && i === messages.length - 1 ? <span className="spin" /> : "")}
          </div>
        ))}
      </div>
      <div className="chat-input">
        {snapshot && (
          <button title="Check my form" onClick={() => send(true)} disabled={busy}>📷</button>
        )}
        <input
          value={input}
          placeholder="Ask your coach…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(false)}
        />
        <button className="primary" onClick={() => send(false)} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
