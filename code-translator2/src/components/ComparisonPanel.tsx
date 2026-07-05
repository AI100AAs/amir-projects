import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Language, TranslationResult } from '../types';
import { translate } from '../engine/translationEngine';
import CodeEditor from './CodeEditor';

interface ComparisonPanelProps {
  onTranslationComplete?: (result: TranslationResult, sourceCode: string, targetCode: string, sourceLang: Language, targetLang: Language) => void;
}

const SUPPORTED_PAIRS: [Language, Language][] = [
  ['python', 'cpp'],
  ['python', 'javascript'],
  ['cpp', 'python'],
  ['javascript', 'python'],
  ['python', 'typescript'],
  ['javascript', 'typescript'],
];

function isSupportedPair(from: Language, to: Language): boolean {
  return SUPPORTED_PAIRS.some(([f, t]) => f === from && t === to);
}

function getSupportedTargets(lang: Language): Language[] {
  return SUPPORTED_PAIRS
    .filter(([f]) => f === lang)
    .map(([, t]) => t);
}

const SAMPLE_CODE: Record<Language, string> = {
  python: `def fibonacci(n):
    """Calculate nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

numbers = [fibonacci(i) for i in range(10)]
print(f"Fibonacci sequence: {numbers}")`,
  cpp: `#include <iostream>
#include <vector>

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

int main() {
    std::vector<int> numbers;
    for (int i = 0; i < 10; i++) {
        numbers.push_back(fibonacci(i));
    }
    std::cout << "Fibonacci: ";
    for (const auto& num : numbers) std::cout << num << " ";
    return 0;
}`,
  javascript: `function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

const numbers = Array.from({length: 10}, (_, i) => fibonacci(i));
console.log(\`Fibonacci: \${numbers.join(', ')}\`);`,
  typescript: `function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

const numbers: number[] = Array.from({length: 10}, (_, i) => fibonacci(i));
console.log(\`Fibonacci: \${numbers.join(', ')}\`);`,
  java: `public class Fibonacci {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n-1) + fibonacci(n-2);
    }
    public static void main(String[] args) {
        System.out.println(fibonacci(10));
    }
}`,
  rust: `fn fibonacci(n: u32) -> u32 {
    if n <= 1 { n } else { fibonacci(n-1) + fibonacci(n-2) }
}

fn main() { println!("{}", fibonacci(10)); }`,
  go: `package main
import "fmt"
func fibonacci(n int) int {
    if n <= 1 { return n }
    return fibonacci(n-1) + fibonacci(n-2)
}
func main() { fmt.Println(fibonacci(10)) }`,
  html: `<!DOCTYPE html>
<html><body><h1>Hello</h1></body></html>`,
  css: `body { font-family: sans-serif; margin: 0; }`,
};

export default function ComparisonPanel({ onTranslationComplete }: ComparisonPanelProps) {
  const { translationMode, setTranslationMode, autoTranslate, setAutoTranslate, addToHistory, lastTranslation } = useApp();
  const { addToast } = useToast();

  const [sourceLang, setSourceLang] = useState<Language>(lastTranslation?.sourceLang || 'python');
  const [targetLang, setTargetLang] = useState<Language>(lastTranslation?.targetLang || 'cpp');
  const [sourceCode, setSourceCode] = useState(lastTranslation?.sourceCode || SAMPLE_CODE.python);
  const [regexCode, setRegexCode] = useState('');
  const [llmCode, setLlmCode] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [regexResult, setRegexResult] = useState<TranslationResult | null>(null);
  const [llmResult, setLlmResult] = useState<TranslationResult | null>(null);
  const [llmError, setLlmError] = useState('');
  const [activeTab, setActiveTab] = useState<'diff' | 'regex' | 'llm'>('diff');

  const targetOptions = getSupportedTargets(sourceLang);

  const performComparison = useCallback(async () => {
    if (!sourceCode.trim() || !isSupportedPair(sourceLang, targetLang)) return;
    setIsTranslating(true);
    setLlmError('');
    setActiveTab('diff');

    try {
      const regexRes = await translate(sourceCode, sourceLang, targetLang, 'regex');
      setRegexCode(regexRes.translatedCode);
      setRegexResult(regexRes);

      const { translateWithLLM } = await import('../services/llmService');
      const llmRes = await translateWithLLM(sourceCode, sourceLang, targetLang, {
        onComplete: (fullText) => {
          console.log('LLM translation complete:', fullText.length, 'chars');
        },
        onError: (error) => {
          setLlmError(error.message);
          addToast(error.message, 'error');
        },
      });
      setLlmCode(llmRes.translatedCode);
      setLlmResult(llmRes);

      onTranslationComplete?.(regexRes, sourceCode, regexRes.translatedCode, sourceLang, targetLang);
      addToHistory({ sourceLang, targetLang, sourceCode, result: regexRes, isFavorite: false });
      addToast('Comparison complete!', 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Comparison failed';
      setLlmError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceCode, sourceLang, targetLang, onTranslationComplete, addToHistory, addToast]);

  const handleSourceLangChange = (lang: Language) => {
    setSourceLang(lang);
    const targets = getSupportedTargets(lang);
    setTargetLang(targets[0] || 'cpp');
    setSourceCode(SAMPLE_CODE[lang] || '');
    setRegexCode('');
    setLlmCode('');
    setRegexResult(null);
    setLlmResult(null);
    setLlmError('');
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied!`, 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const getDiffStats = () => {
    if (!regexCode || !llmCode) return { added: 0, removed: 0, unchanged: 0 };
    const regexLines = regexCode.split('\n');
    const llmLines = llmCode.split('\n');
    const maxLen = Math.max(regexLines.length, llmLines.length);
    let added = 0, removed = 0, unchanged = 0;
    for (let i = 0; i < maxLen; i++) {
      if (regexLines[i] === llmLines[i]) unchanged++;
      else { added++; removed++; }
    }
    return { added, removed, unchanged };
  };

  const diffStats = getDiffStats();
  const similarity = diffStats.unchanged > 0
    ? ((diffStats.unchanged / Math.max(diffStats.unchanged + diffStats.added, 1)) * 100).toFixed(0)
    : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
        padding: '0.5rem', backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
      }}>
        <select value={sourceLang} onChange={e => handleSourceLangChange(e.target.value as Language)} style={selectStyle}>
          {(['python', 'cpp', 'javascript', 'typescript', 'java', 'rust', 'go', 'html', 'css'] as Language[]).map(lang => (
            <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
          ))}
        </select>
        <select value={targetLang} onChange={e => setTargetLang(e.target.value as Language)} disabled={targetOptions.length === 0} style={selectStyle}>
          {targetOptions.map(lang => (
            <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
          ))}
          {targetOptions.length === 0 && <option disabled>No translation available</option>}
        </select>
        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.25rem' }} />
        <select value={translationMode} onChange={e => setTranslationMode(e.target.value as any)} style={{ ...selectStyle, width: '100px' }}>
          <option value="regex">⚡ Regex</option>
          <option value="llm">🤖 LLM</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoTranslate} onChange={e => setAutoTranslate(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Auto
        </label>
        <button onClick={performComparison} disabled={!sourceCode.trim() || !isSupportedPair(sourceLang, targetLang) || isTranslating} style={{ ...primaryButtonStyle, opacity: sourceCode.trim() && isSupportedPair(sourceLang, targetLang) ? 1 : 0.5 }}>
          {isTranslating ? '⏳ Comparing...' : '🔀 Compare'}
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {(['diff', 'regex', 'llm'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.4rem 0.8rem', backgroundColor: activeTab === tab ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: activeTab === tab ? 'white' : 'var(--text-secondary)', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeTab === tab ? 600 : 400,
          }}>
            {tab === 'diff' ? '📊 Diff' : tab === 'regex' ? '⚡ Regex' : '🤖 LLM'}
          </button>
        ))}
      </div>

      {/* Error */}
      {llmError && (
        <div style={{ padding: '0.6rem 0.75rem', backgroundColor: 'var(--error-bg)', border: '1px solid var(--error)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: '0.85rem' }}>
          {llmError}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {activeTab === 'diff' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
            {/* Stats bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem',
            }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span style={{ color: 'var(--success)' }}>✓ {diffStats.unchanged} same</span>
                <span style={{ color: 'var(--error)' }}>✗ {diffStats.added} different</span>
                <span style={{ color: 'var(--accent)' }}>📈 {similarity}% similar</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleCopy(regexCode, 'Regex')} style={iconButtonStyle}>📋 Regex</button>
                <button onClick={() => handleCopy(llmCode, 'LLM')} style={iconButtonStyle}>📋 LLM</button>
              </div>
            </div>
            {/* Side by side diff */}
            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', minHeight: 0 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>⚡ Regex Output</div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={regexCode || 'Run comparison to see regex output...'} language={targetLang} height="100%" />
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>🤖 LLM Output</div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={llmCode || 'Run comparison to see LLM output...'} language={targetLang} height="100%" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regex' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', minHeight: 0 }}>
            <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚡ Regex Translation</span>
              {regexResult && <span style={{ color: 'var(--accent)' }}>Confidence: {(regexResult.confidence * 100).toFixed(0)}%</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CodeEditor value={regexCode || 'Run comparison to see regex output...'} language={targetLang} height="100%" />
            </div>
          </div>
        )}

        {activeTab === 'llm' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', minHeight: 0 }}>
            <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🤖 LLM Translation</span>
              {llmResult && <span style={{ color: 'var(--accent)' }}>Confidence: {(llmResult.confidence * 100).toFixed(0)}%</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CodeEditor value={llmCode || 'Run comparison to see LLM output...'} language={targetLang} height="100%" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
};

const iconButtonStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem', backgroundColor: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', transition: 'all var(--transition)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', backgroundColor: 'var(--accent)', color: 'white', border: 'none',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all var(--transition)',
};
