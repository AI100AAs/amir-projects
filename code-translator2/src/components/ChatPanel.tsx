import { useState } from 'react';
import type { TranslationResult, ChatMessage } from '../types';

interface ChatPanelProps {
  translationResult?: TranslationResult | null;
  sourceCode?: string;
  targetCode?: string;
  sourceLang?: string;
  targetLang?: string;
}

const ETHICAL_CONSIDERATIONS = [
  {
    title: '⚠️ Reliability & Silent Bugs',
    content: 'Regex-based translation cannot guarantee 100% accuracy. Complex patterns may not translate correctly. Always review translated code before production use.',
    severity: 'high' as const,
  },
  {
    title: '🤖 LLM Translation Quality',
    content: 'AI-generated translations may introduce subtle bugs or security vulnerabilities. The model may hallucinate code patterns or miss edge cases.',
    severity: 'high' as const,
  },
  {
    title: '📚 Educational Value',
    content: 'Use this tool as a learning aid to understand language differences, not as a replacement for studying each language fundamentals.',
    severity: 'medium' as const,
  },
  {
    title: '🔒 Security Considerations',
    content: 'Always audit translated code for security issues, especially when translating untrusted source code. AI may introduce unsafe patterns.',
    severity: 'high' as const,
  },
  {
    title: '⚖️ Copyright & Licensing',
    content: 'Translated code inherits the original license. Ensure you have the right to translate and use the source code.',
    severity: 'medium' as const,
  },
  {
    title: '🌍 Climate Impact',
    content: 'LLM translations require computational resources. Use regex mode for simple translations to reduce energy consumption.',
    severity: 'low' as const,
  },
];

export default function ChatPanel({ translationResult, sourceCode, targetCode, sourceLang, targetLang }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome! I can help explain translations, review code quality, and discuss best practices. How can I assist?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      let response: string;
      const lower = input.toLowerCase();

      if (lower.includes('explain') || lower.includes('difference') || lower.includes('translate')) {
        if (sourceCode && targetCode && sourceLang && targetLang) {
          const { explainTranslation } = await import('../services/llmService');
          response = await explainTranslation(sourceCode, targetCode, sourceLang, targetLang, {
            onChunk: (chunk) => {
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              ));
            },
          });
        } else {
          response = 'Please perform a translation first so I can explain the differences.';
        }
      } else if (lower.includes('review') || lower.includes('quality') || lower.includes('bug')) {
        if (targetCode) {
          const { checkCodeQuality } = await import('../services/llmService');
          response = await checkCodeQuality(targetCode, targetLang || 'python', {
            onChunk: (chunk) => {
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              ));
            },
          });
        } else {
          response = 'Please translate some code first so I can review it.';
        }
      } else if (lower.includes('ethical') || lower.includes('concern') || lower.includes('risk')) {
        response = ETHICAL_CONSIDERATIONS.map(e => `${e.title}\n${e.content}`).join('\n\n');
      } else if (lower.includes('confidence') || lower.includes('reliab')) {
        if (translationResult) {
          response = `Translation confidence: ${(translationResult.confidence * 100).toFixed(1)}%\n\nThis is based on pattern matching coverage. Always review translated code carefully.`;
        } else {
          response = 'No translation has been performed yet.';
        }
      } else if (lower.includes('note') || lower.includes('explan')) {
        if (translationResult && translationResult.comments.length > 0) {
          response = translationResult.comments.map((c, i) => `${i + 1}. ${c}`).join('\n');
        } else {
          response = 'No translation notes available.';
        }
      } else {
        response = 'I can help with:\n• **Explain** - Explain translation differences\n• **Review** - Review code quality\n• **Ethical** - Discuss ethical considerations\n• **Confidence** - Check translation confidence\n• **Notes** - Show translation notes';
      }

      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: response }
          : msg
      ));
    } catch {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Sorry, I could not generate a response. Please try again.' }
          : msg
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id || crypto.randomUUID()}
            className="animate-fade-in"
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
            }}
          >
            {msg.content || <span style={{ animation: 'pulse 1s ease infinite' }}>Thinking...</span>}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Explain', prompt: 'Explain the translation differences' },
            { label: 'Review', prompt: 'Review the code quality' },
            { label: 'Ethical', prompt: 'Show ethical considerations' },
            { label: 'Confidence', prompt: 'What is the confidence level?' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => {
                setInput(action.prompt);
              }}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about the translation..."
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isGenerating}
          style={{
            padding: '0.6rem 1.25rem',
            backgroundColor: input.trim() && !isGenerating ? 'var(--accent)' : 'var(--bg-hover)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: input.trim() && !isGenerating ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
