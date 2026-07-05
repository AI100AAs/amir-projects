import { memo } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import type { Language } from '../types';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: Language;
  readOnly?: boolean;
  height?: string;
  showLineNumbers?: boolean;
  placeholder?: string;
}

const languageExtensions: Record<Language, any[]> = {
  python: [python()],
  cpp: [cpp()],
  javascript: [javascript({ jsx: false, typescript: false })],
  typescript: [javascript({ jsx: false, typescript: true })],
  java: [],
  rust: [],
  go: [],
  html: [html()],
  css: [css()],
};

const CodeEditorComponent = ({
  value,
  onChange,
  language,
  readOnly = false,
  showLineNumbers = true,
  placeholder = '',
}: CodeEditorProps) => {
  const extensions = [
    ...languageExtensions[language],
    EditorView.lineWrapping,
    EditorState.readOnly.of(readOnly),
    EditorView.updateListener.of(update => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    }),
  ];

  if (!showLineNumbers) {
    extensions.push(EditorView.updateListener.of(() => {}) as any);
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        onChange={onChange}
        editable={!readOnly}
        placeholder={placeholder}
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  );
};

export default memo(CodeEditorComponent);
