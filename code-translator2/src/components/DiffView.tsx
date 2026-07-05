import { useMemo } from 'react';
import DMP from 'diff-match-patch';

interface DiffViewProps {
  original: string;
  modified: string;
}

interface DiffLine {
  text: string;
  type: 'same' | 'add' | 'remove';
}

export default function DiffView({ original, modified }: DiffViewProps) {
  const diffLines: DiffLine[] = useMemo(() => {
    if (!original && !modified) return [];

    const dmp = new DMP();
    const diffs = dmp.diff_main(original, modified);
    dmp.diff_cleanupMerge(diffs);

    const lines: DiffLine[] = [];
    let lineNum = 1;

    for (const [type, text] of diffs) {
      const textLines = text.split('\n');
      if (textLines[textLines.length - 1] === '') textLines.pop();

      for (const line of textLines) {
        if (type === 0) {
          lines.push({ text: `  ${lineNum}: ${line}`, type: 'same' });
        } else if (type === -1) {
          lines.push({ text: `-${lineNum}: ${line}`, type: 'remove' });
        } else {
          lines.push({ text: `+${lineNum}: ${line}`, type: 'add' });
        }
        lineNum++;
      }
    }

    return lines;
  }, [original, modified]);

  const stats = useMemo(() => {
    const adds = diffLines.filter(l => l.type === 'add').length;
    const removes = diffLines.filter(l => l.type === 'remove').length;
    return { adds, removes, total: diffLines.length };
  }, [diffLines]);

  if (!original && !modified) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
        <div style={{ fontSize: '0.9rem' }}>Enter code in the translation panel to see the diff</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.8rem',
      }}>
        <span style={{ color: 'var(--success)' }}>+{stats.adds} added</span>
        <span style={{ color: 'var(--error)' }}>-{stats.removes} removed</span>
        <span style={{ color: 'var(--text-muted)' }}>{stats.total} total lines</span>
      </div>

      {/* Diff content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        lineHeight: 1.6,
      }}>
        {diffLines.map((line, i) => (
          <div
            key={i}
            style={{
              padding: '1px 0.75rem',
              backgroundColor: line.type === 'add' ? 'var(--success-bg)' : line.type === 'remove' ? 'var(--error-bg)' : 'transparent',
              color: line.type === 'add' ? 'var(--success)' : line.type === 'remove' ? 'var(--error)' : 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
