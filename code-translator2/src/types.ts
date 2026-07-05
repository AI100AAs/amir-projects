export type Language = 'python' | 'cpp' | 'javascript' | 'typescript' | 'java' | 'rust' | 'go' | 'html' | 'css';

export interface TranslationResult {
  translatedCode: string;
  comments: string[];
  confidence: number;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TestCase {
  name: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  inputCode: string;
  expectedOutput: string;
  description: string;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  cpp: 'C++',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  rust: 'Rust',
  go: 'Go',
  html: 'HTML',
  css: 'CSS',
};

export const LANGUAGE_EXTENSIONS: Record<Language, string> = {
  python: '.py',
  cpp: '.cpp',
  javascript: '.js',
  typescript: '.ts',
  java: '.java',
  rust: '.rs',
  go: '.go',
  html: '.html',
  css: '.css',
};
