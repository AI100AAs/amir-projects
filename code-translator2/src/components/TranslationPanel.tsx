import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Language, TranslationResult } from '../types';
import { translate, type TranslationMode } from '../engine/translationEngine';
import CodeEditor from './CodeEditor';

interface TranslationPanelProps {
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

# Generate first 10 Fibonacci numbers
numbers = [fibonacci(i) for i in range(10)]
print(f"Fibonacci sequence: {numbers}")`,
  cpp: `#include <iostream>
#include <vector>
#include <string>

// Calculate nth Fibonacci number
int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

int main() {
    std::vector<int> numbers;
    for (int i = 0; i < 10; i++) {
        numbers.push_back(fibonacci(i));
    }
    
    std::cout << "Fibonacci sequence: ";
    for (const auto& num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    
    return 0;
}`,
  javascript: `/**
 * Calculate nth Fibonacci number
 * @param {number} n - The position
 * @returns {number} Fibonacci number
 */
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

// Generate first 10 Fibonacci numbers
const numbers = Array.from({length: 10}, (_, i) => fibonacci(i));
console.log(\`Fibonacci sequence: \${numbers.join(', ')}\`);`,
  typescript: `/**
 * Calculate nth Fibonacci number
 * @param n - The position
 * @returns Fibonacci number
 */
function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

// Generate first 10 Fibonacci numbers
const numbers: number[] = Array.from({length: 10}, (_, i) => fibonacci(i));
console.log(\`Fibonacci sequence: \${numbers.join(', ')}\`);`,
  java: `import java.util.ArrayList;
import java.util.List;

public class Fibonacci {
    /**
     * Calculate nth Fibonacci number
     * @param n The position
     * @return Fibonacci number
     */
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n-1) + fibonacci(n-2);
    }
    
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            numbers.add(fibonacci(i));
        }
        System.out.println("Fibonacci sequence: " + numbers);
    }
}`,
  rust: `/// Calculate nth Fibonacci number
fn fibonacci(n: u32) -> u32 {
    if n <= 1 {
        n
    } else {
        fibonacci(n - 1) + fibonacci(n - 2)
    }
}

fn main() {
    let numbers: Vec<u32> = (0..10).map(|i| fibonacci(i)).collect();
    println!("Fibonacci sequence: {:?}", numbers);
}`,
  go: `package main

import "fmt"

// fibonacci calculates the nth Fibonacci number
func fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return fibonacci(n-1) + fibonacci(n-2)
}

func main() {
    var numbers []int
    for i := 0; i < 10; i++ {
        numbers = append(numbers, fibonacci(i))
    }
    fmt.Printf("Fibonacci sequence: %v\\n", numbers)
}`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fibonacci Generator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Fibonacci Sequence</h1>
        <button onclick="generate()">Generate</button>
        <ul id="result"></ul>
    </div>
    <script>
        function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n-1) + fibonacci(n-2);
        }
        function generate() {
            const list = document.getElementById('result');
            list.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const li = document.createElement('li');
                li.textContent = fibonacci(i);
                list.appendChild(li);
            }
        }
    </script>
</body>
</html>`,
  css: `body {
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
    background-color: #f5f5f5;
}

.container {
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
    color: #333;
    margin-bottom: 1rem;
}

button {
    padding: 0.5rem 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

button:hover {
    background-color: #0056b3;
}

ul {
    list-style: none;
    padding: 0;
    margin-top: 1rem;
}

li {
    padding: 0.5rem;
    margin: 0.25rem 0;
    background: #f0f0f0;
    border-radius: 4px;
}`,
};

export default function TranslationPanel({ onTranslationComplete }: TranslationPanelProps) {
  const { translationMode, setTranslationMode, autoTranslate, setAutoTranslate, addToHistory, lastTranslation, setLastTranslation } = useApp();
  const { addToast } = useToast();
  
  const [sourceLang, setSourceLang] = useState<Language>(lastTranslation?.sourceLang || 'python');
  const [targetLang, setTargetLang] = useState<Language>(lastTranslation?.targetLang || 'cpp');
  const [sourceCode, setSourceCode] = useState(lastTranslation?.sourceCode || SAMPLE_CODE.python);
  const [translatedCode, setTranslatedCode] = useState(lastTranslation?.targetCode || '');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(lastTranslation?.result || null);
  const [llmError, setLlmError] = useState<string>('');
  const [wordCount, setWordCount] = useState({ source: 0, target: 0 });
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const targetOptions = getSupportedTargets(sourceLang);

  // Sync with global state when it changes
  useEffect(() => {
    if (lastTranslation) {
      setSourceLang(lastTranslation.sourceLang);
      setTargetLang(lastTranslation.targetLang);
      setSourceCode(lastTranslation.sourceCode);
      setTranslatedCode(lastTranslation.targetCode);
      setTranslationResult(lastTranslation.result);
    }
  }, [lastTranslation]);

  useEffect(() => {
    const srcWords = sourceCode.trim() ? sourceCode.trim().split(/\s+/).length : 0;
    const tgtWords = translatedCode.trim() ? translatedCode.trim().split(/\s+/).length : 0;
    setWordCount({ source: srcWords, target: tgtWords });
  }, [sourceCode, translatedCode]);

  // Update global state when local state changes
  useEffect(() => {
    if (sourceCode || translatedCode) {
      setLastTranslation({
        sourceCode,
        targetCode: translatedCode,
        sourceLang,
        targetLang,
        result: translationResult,
      });
    }
  }, [sourceCode, translatedCode, sourceLang, targetLang, translationResult, setLastTranslation]);

  const handleSourceLangChange = (lang: Language) => {
    setSourceLang(lang);
    const targets = getSupportedTargets(lang);
    setTargetLang(targets[0] || 'cpp');
    setSourceCode(SAMPLE_CODE[lang] || '');
    setTranslatedCode('');
    setTranslationResult(null);
    setLlmError('');
  };

  const performTranslation = useCallback(async () => {
    if (!sourceCode.trim() || !isSupportedPair(sourceLang, targetLang)) return;

    setIsTranslating(true);
    setLlmError('');

    try {
      let result: TranslationResult;
      
      if (translationMode === 'llm') {
        const { translateWithLLM } = await import('../services/llmService');
        result = await translateWithLLM(sourceCode, sourceLang, targetLang, {
          onChunk: (chunk) => {
            setTranslatedCode(prev => prev + chunk);
          },
          onComplete: (fullText) => {
            console.log('Translation complete:', fullText.length, 'chars');
          },
          onError: (error) => {
            setLlmError(error.message);
            addToast(error.message, 'error');
          },
        });
      } else {
        result = await translate(sourceCode, sourceLang, targetLang, 'regex');
      }

      setTranslationResult(result);
      onTranslationComplete?.(result, sourceCode, result.translatedCode, sourceLang, targetLang);
      
      addToHistory({
        sourceLang,
        targetLang,
        sourceCode,
        result,
        isFavorite: false,
      });
      
      addToast('Translation complete!', 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Translation failed';
      setLlmError(errorMsg);
      addToast(errorMsg, 'error');
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceCode, sourceLang, targetLang, translationMode, onTranslationComplete, addToHistory, addToast]);

  useEffect(() => {
    if (autoTranslate && sourceCode.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        performTranslation();
      }, 800);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sourceCode, sourceLang, targetLang, autoTranslate, performTranslation]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied to clipboard!`, 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const handleDownload = (text: string, lang: Language) => {
    const extensions: Record<Language, string> = {
      python: 'py', cpp: 'cpp', javascript: 'js', typescript: 'ts',
      java: 'java', rust: 'rs', go: 'go', html: 'html', css: 'css',
    };
    const ext = extensions[lang] || 'txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('File downloaded!', 'success');
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceCode(translatedCode);
    setTranslatedCode(sourceCode);
    setTranslationResult(null);
    setLlmError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.5rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <select
          value={sourceLang}
          onChange={e => handleSourceLangChange(e.target.value as Language)}
          style={selectStyle}
        >
          {(['python', 'cpp', 'javascript', 'typescript', 'java', 'rust', 'go', 'html', 'css'] as Language[]).map(lang => (
            <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
          ))}
        </select>

        <button onClick={handleSwap} disabled={!translatedCode} title="Swap languages" style={iconButtonStyle}>
          ⇄
        </button>

        <select
          value={targetLang}
          onChange={e => setTargetLang(e.target.value as Language)}
          disabled={targetOptions.length === 0}
          style={selectStyle}
        >
          {targetOptions.map(lang => (
            <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
          ))}
          {targetOptions.length === 0 && <option disabled>No translation available</option>}
        </select>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.25rem' }} />

        <select
          value={translationMode}
          onChange={e => setTranslationMode(e.target.value as TranslationMode)}
          style={{ ...selectStyle, width: '100px' }}
        >
          <option value="regex">⚡ Regex</option>
          <option value="llm">🤖 LLM</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoTranslate}
            onChange={e => setAutoTranslate(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          Auto
        </label>

        <button
          onClick={performTranslation}
          disabled={!sourceCode.trim() || !isSupportedPair(sourceLang, targetLang) || isTranslating}
          style={{
            ...primaryButtonStyle,
            opacity: sourceCode.trim() && isSupportedPair(sourceLang, targetLang) ? 1 : 0.5,
          }}
        >
          {isTranslating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '14px', height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
              Translating...
            </span>
          ) : 'Translate'}
        </button>
      </div>

      {/* Error message */}
      {llmError && (
        <div style={{
          padding: '0.6rem 0.75rem',
          backgroundColor: 'var(--error-bg)',
          border: '1px solid var(--error)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--error)',
          fontSize: '0.85rem',
        }}>
          {llmError}
        </div>
      )}

      {/* Editors */}
      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minHeight: 0 }}>
        {/* Source */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {sourceLang.toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => handleCopy(sourceCode, 'Source')} title="Copy" style={iconButtonStyle}>📋</button>
              <button onClick={() => handleDownload(sourceCode, sourceLang)} title="Download" style={iconButtonStyle}>⬇</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor value={sourceCode} onChange={setSourceCode} language={sourceLang} height="100%" />
          </div>
        </div>

        {/* Target */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {targetLang.toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => handleCopy(translatedCode, 'Translation')} title="Copy" style={iconButtonStyle}>📋</button>
              <button onClick={() => translatedCode && handleDownload(translatedCode, targetLang)} title="Download" style={{ ...iconButtonStyle, opacity: translatedCode ? 1 : 0.3 }}>⬇</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor value={translatedCode} onChange={setTranslatedCode} language={targetLang} height="100%" />
          </div>
        </div>
      </div>

      {/* Stats & Notes */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Source: {wordCount.source} words</span>
          <span>Target: {wordCount.target} words</span>
          {translationResult && <span>Confidence: {(translationResult.confidence * 100).toFixed(0)}%</span>}
        </div>
        {translationResult && translationResult.comments.length > 0 && (
          <span style={{ color: 'var(--accent)' }}>
            {translationResult.comments.length} note{translationResult.comments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Translation notes */}
      {translationResult && translationResult.comments.length > 0 && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          maxHeight: '150px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
            Translation Notes:
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {translationResult.comments.slice(0, 5).map((comment, i) => (
              <li key={i} style={{
                padding: '0.3rem 0',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border)',
              }}>
                • {comment}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  outline: 'none',
};

const iconButtonStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'all var(--transition)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.4rem 1rem',
  backgroundColor: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 500,
  transition: 'all var(--transition)',
};
