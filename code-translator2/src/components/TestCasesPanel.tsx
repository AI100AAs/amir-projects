import { useState } from 'react';
import type { TestCase } from '../types';
import { translate, type TranslationMode } from '../engine/translationEngine';
import CodeEditor from './CodeEditor';

const TEST_CASES: TestCase[] = [
  {
    name: 'Fibonacci',
    sourceLanguage: 'python',
    targetLanguage: 'cpp',
    inputCode: `def fibonacci(n):
    """Calculate nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Print first 10 numbers
for i in range(10):
    print(fibonacci(i))`,
    expectedOutput: '0 1 1 2 3 5 8 13 21 34',
    description: 'Recursive Fibonacci sequence',
  },
  {
    name: 'String Reversal',
    sourceLanguage: 'python',
    targetLanguage: 'javascript',
    inputCode: `def reverse_string(s):
    """Reverse a string."""
    return s[::-1]

result = reverse_string("Hello, World!")
print(result)`,
    expectedOutput: '!dlroW ,olleH',
    description: 'String reversal using slicing',
  },
  {
    name: 'List Comprehension',
    sourceLanguage: 'python',
    targetLanguage: 'cpp',
    inputCode: `# Squares of even numbers
numbers = [x**2 for x in range(10) if x % 2 == 0]
print(numbers)`,
    expectedOutput: '[0, 4, 16, 36, 64]',
    description: 'Filter and transform with comprehension',
  },
  {
    name: 'Word Counter',
    sourceLanguage: 'python',
    targetLanguage: 'javascript',
    inputCode: `def count_words(text):
    """Count word frequencies."""
    words = text.lower().split()
    counts = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts

result = count_words("hello world hello")
print(result)`,
    expectedOutput: "{'hello': 2, 'world': 1}",
    description: 'Word frequency analysis',
  },
  {
    name: 'Bubble Sort',
    sourceLanguage: 'cpp',
    targetLanguage: 'python',
    inputCode: `#include <iostream>
#include <vector>

void bubbleSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}

int main() {
    std::vector<int> arr = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(arr);
    for (const auto& num : arr) {
        std::cout << num << " ";
    }
    return 0;
}`,
    expectedOutput: '11 12 22 25 34 64 90',
    description: 'Bubble sort algorithm',
  },
  {
    name: 'Factorial',
    sourceLanguage: 'python',
    targetLanguage: 'cpp',
    inputCode: `def factorial(n):
    """Calculate factorial iteratively."""
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

print(f"5! = {factorial(5)}")`,
    expectedOutput: '5! = 120',
    description: 'Iterative factorial calculation',
  },
  {
    name: 'Even Filter',
    sourceLanguage: 'python',
    targetLanguage: 'javascript',
    inputCode: `numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
even_numbers = [n for n in numbers if n % 2 == 0]
print(f"Even numbers: {even_numbers}")`,
    expectedOutput: 'Even numbers: [2, 4, 6, 8, 10]',
    description: 'Filter even numbers',
  },
  {
    name: 'Class & Methods',
    sourceLanguage: 'python',
    targetLanguage: 'javascript',
    inputCode: `class Dog:
    """A simple Dog class."""
    
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed
        self.tricks = []
    
    def add_trick(self, trick):
        self.tricks.append(trick)
    
    def bark(self):
        return f"{self.name} says woof!"
    
    def __str__(self):
        return f"{self.name} ({self.breed})"

dog = Dog("Buddy", "Golden Retriever")
dog.add_trick("sit")
dog.add_trick("stay")
print(dog.bark())
print(dog)
print(f"Tricks: {dog.tricks}")`,
    expectedOutput: 'Buddy says woof!\nBuddy (Golden Retriever)\nTricks: [\'sit\', \'stay\']',
    description: 'OOP with constructor and methods',
  },
  {
    name: 'Matrix Transpose',
    sourceLanguage: 'python',
    targetLanguage: 'cpp',
    inputCode: `matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
transposed = [[matrix[j][i] for j in range(len(matrix))] for i in range(len(matrix[0]))]
for row in transposed:
    print(row)`,
    expectedOutput: '[1, 4, 7]\\n[2, 5, 8]\\n[3, 6, 9]',
    description: 'Matrix transpose with nested comprehensions',
  },
  {
    name: 'Exception Handling',
    sourceLanguage: 'python',
    targetLanguage: 'cpp',
    inputCode: `def divide(a, b):
    """Safe division with error handling."""
    try:
        result = a / b
        print(f"Result: {result}")
    except ZeroDivisionError:
        print("Error: Cannot divide by zero")
    finally:
        print("Operation complete")

divide(10, 2)
divide(10, 0)`,
    expectedOutput: 'Result: 5.0\\nOperation complete\\nError: Cannot divide by zero\\nOperation complete',
    description: 'Try-except-finally pattern',
  },
];

interface TestCasesPanelProps {
  onRunTest?: (testCase: TestCase, result: string) => void;
}

export default function TestCasesPanel({ onRunTest }: TestCasesPanelProps) {
  const [selectedTest, setSelectedTest] = useState<TestCase>(TEST_CASES[0]);
  const [translatedCode, setTranslatedCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationMode, setTranslationMode] = useState<TranslationMode>('regex');

  const handleSelectTest = (testCase: TestCase) => {
    setSelectedTest(testCase);
    setTranslatedCode('');
    setOutput('');
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const result = await translate(
        selectedTest.inputCode,
        selectedTest.sourceLanguage,
        selectedTest.targetLanguage,
        translationMode
      );
      setTranslatedCode(result.translatedCode);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRun = () => {
    if (!translatedCode) return;
    setIsRunning(true);
    setTimeout(() => {
      const mockOutput = generateMockOutput(selectedTest);
      setOutput(mockOutput);
      onRunTest?.(selectedTest, mockOutput);
      setIsRunning(false);
    }, 500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Test case selector */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        flexWrap: 'wrap',
        padding: '0.5rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        {TEST_CASES.map(tc => (
          <button
            key={tc.name}
            onClick={() => handleSelectTest(tc)}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: selectedTest.name === tc.name ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: selectedTest.name === tc.name ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: selectedTest.name === tc.name ? 500 : 400,
              transition: 'all 150ms ease',
            }}
          >
            {tc.name}
          </button>
        ))}
      </div>

      {/* Test info */}
      <div style={{
        padding: '0.6rem 0.75rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '0.9rem' }}>{selectedTest.name}</strong>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {selectedTest.description}
            </span>
          </div>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            backgroundColor: 'var(--accent-bg)',
            color: 'var(--accent)',
            borderRadius: 'var(--radius-sm)',
          }}>
            {selectedTest.sourceLanguage} → {selectedTest.targetLanguage}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <select
          value={translationMode}
          onChange={e => setTranslationMode(e.target.value as TranslationMode)}
          style={{
            padding: '0.35rem 0.5rem',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
          }}
        >
          <option value="regex">⚡ Regex</option>
          <option value="llm">🤖 LLM</option>
        </select>
        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          style={{
            padding: '0.4rem 1rem',
            backgroundColor: isTranslating ? 'var(--bg-hover)' : 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: isTranslating ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {isTranslating ? 'Translating...' : 'Translate'}
        </button>
        <button
          onClick={handleRun}
          disabled={!translatedCode || isRunning}
          style={{
            padding: '0.4rem 1rem',
            backgroundColor: translatedCode && !isRunning ? 'var(--success)' : 'var(--bg-hover)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: translatedCode && !isRunning ? 'pointer' : 'not-allowed',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {isRunning ? 'Running...' : 'Run Test'}
        </button>
      </div>

      {/* Code editor */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          padding: '0.4rem 0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          Translated ({selectedTest.targetLanguage})
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor value={translatedCode} language={selectedTest.targetLanguage} readOnly height="100%" />
        </div>
      </div>

      {/* Output */}
      {output && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
            Output:
          </div>
          <pre style={{
            margin: 0,
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--success)',
            whiteSpace: 'pre-wrap',
          }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

function generateMockOutput(testCase: TestCase): string {
  const outputs: Record<string, string> = {
    'Fibonacci': '0 1 1 2 3 5 8 13 21 34',
    'String Reversal': '!dlroW ,olleH',
    'List Comprehension': '[0, 4, 16, 36, 64]',
    'Word Counter': "{'hello': 2, 'world': 1}",
    'Bubble Sort': '11 12 22 25 34 64 90',
    'Factorial': '5! = 120',
    'Even Filter': 'Even numbers: [2, 4, 6, 8, 10]',
    'Class & Methods': 'Buddy says woof!\nBuddy (Golden Retriever)\nTricks: [\'sit\', \'stay\']',
    'Matrix Transpose': '[1, 4, 7]\n[2, 5, 8]\n[3, 6, 9]',
    'Exception Handling': 'Result: 5.0\nOperation complete\nError: Cannot divide by zero\nOperation complete',
  };
  return outputs[testCase.name] || 'Output would appear here';
}
