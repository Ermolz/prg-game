import { useState, useEffect, useRef } from 'react';
import type { LogEntry } from '../model/settings';

const MAX_ENTRIES = 400;
type Filter = 'all' | 'game' | 'bot' | 'stderr';

type LogPanelProps = {
  logsVerbose?: boolean;
};

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 12);
}

function formatDir(dir: LogEntry['dir']): string {
  if (dir === 'req') return '→';
  if (dir === 'res') return '←';
  return 'stderr';
}

export function LogPanel({ logsVerbose = false }: LogPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (entry: LogEntry) => {
      setEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > MAX_ENTRIES) return next.slice(-MAX_ENTRIES);
        return next;
      });
    };
    window.dab?.onLog?.(handler);
    return () => {
      // Preload doesn't expose removeListener; handler stays but we only append from main
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const filtered =
    filter === 'all'
      ? entries
      : filter === 'stderr'
        ? entries.filter((e) => e.dir === 'stderr')
        : entries.filter((e) => e.scope === filter && e.dir !== 'stderr');

  const handleClear = () => setEntries([]);

  const handleCopy = async () => {
    const text = filtered
      .map((e) => {
        const dataStr =
          logsVerbose && e.data !== undefined
            ? JSON.stringify(e.data)
            : e.dir === 'stderr'
              ? String(e.data)
              : e.dir === 'req'
                ? `method=${e.method ?? '-'}`
                : e.ok ? `ok ${e.ms ?? '-'}ms` : 'ERR';
        return `${formatTs(e.ts)} [${e.scope}:${e.engine}] ${formatDir(e.dir)} ${e.method ?? ''} ${dataStr}`;
      })
      .join('\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="border-t border-gray-200 bg-gray-900 text-gray-100 flex flex-col h-40">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-400">Log</span>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          onClick={() => setFilter('game')}
        >
          Game
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          onClick={() => setFilter('bot')}
        >
          Bot
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          onClick={() => setFilter('stderr')}
        >
          Stderr
        </button>
        <button type="button" className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={handleClear}>
          Clear
        </button>
        <button type="button" className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs p-2">
        {filtered.map((e, i) => (
          <div key={i} className="flex gap-2 text-gray-300">
            <span className="text-gray-500 shrink-0">{formatTs(e.ts)}</span>
            <span className="shrink-0">[{e.scope}:{e.engine}]</span>
            <span className="shrink-0">{formatDir(e.dir)}</span>
            {e.method != null && <span>{e.method}</span>}
            {e.dir === 'res' && (
              <span>{e.ok ? `ok ${e.ms ?? '-'}ms` : 'ERR'}</span>
            )}
            {e.dir === 'stderr' && <span>{String(e.data)}</span>}
            {logsVerbose && e.dir !== 'stderr' && e.data !== undefined && (
              <span className="text-gray-500 truncate">{JSON.stringify(e.data)}</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
