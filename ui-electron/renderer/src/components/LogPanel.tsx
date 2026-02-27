import { useState, useEffect, useRef } from 'react';
import type { LogEntry } from '../model/settings';
import { btnGhost } from '../lib/constants';

const MAX_ENTRIES = 400;
const MAX_HEIGHT = 220;
type Filter = 'all' | 'game' | 'bot' | 'stderr';

type LogPanelProps = {
  logsVerbose?: boolean;
  autoScroll?: boolean;
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

function formatEntryLine(e: LogEntry, logsVerbose: boolean): string {
  const dataStr =
    logsVerbose && e.data !== undefined
      ? JSON.stringify(e.data)
      : e.dir === 'stderr'
        ? String(e.data)
        : e.dir === 'req'
          ? `method=${e.method ?? '-'}`
          : e.ok ? `ok ${e.ms ?? '-'}ms` : 'ERR';
  return `${formatTs(e.ts)} [${e.scope}:${e.engine}] ${formatDir(e.dir)} ${e.method ?? ''} ${dataStr}`;
}

export function LogPanel({ logsVerbose = false, autoScroll = true }: LogPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState(false);
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
    return () => {};
  }, []);

  useEffect(() => {
    if (autoScroll && !collapsed) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, autoScroll, collapsed]);

  const filtered =
    filter === 'all'
      ? entries
      : filter === 'stderr'
        ? entries.filter((e) => e.dir === 'stderr')
        : entries.filter((e) => e.scope === filter && e.dir !== 'stderr');

  const handleClear = () => setEntries([]);

  const textForExport = filtered.map((e) => formatEntryLine(e, logsVerbose)).join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textForExport);
  };

  const handleExport = () => {
    const blob = new Blob([textForExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dab-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (collapsed) {
    return (
      <div
        className="border-t border-gray-700 bg-gray-900 text-gray-200 flex items-center justify-between px-3 py-1.5 min-h-0 shrink-0"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        <span className="text-xs font-medium text-gray-400">
          Log ({entries.length} entries)
        </span>
        <button
          type="button"
          className={`${btnGhost} text-xs !py-1 !px-2 text-gray-400 hover:text-gray-200`}
          onClick={() => setCollapsed(false)}
        >
          Expand ▼
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-t border-gray-700 bg-gray-900 text-gray-200 flex flex-col min-h-0 shrink-0 max-h-[220px]"
      style={{ fontFamily: 'ui-monospace, monospace' }}
    >
      <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-gray-700 shrink-0">
        <button
          type="button"
          className={`${btnGhost} text-xs !py-1 !px-2 text-gray-400 hover:text-gray-200`}
          onClick={() => setCollapsed(true)}
        >
          ▲ Collapse
        </button>
        <span className="text-xs text-gray-500">|</span>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={() => setFilter('all')}>
          All
        </button>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={() => setFilter('game')}>
          Game
        </button>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={() => setFilter('bot')}>
          Bot
        </button>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={() => setFilter('stderr')}>
          Stderr
        </button>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={handleClear}>
          Clear
        </button>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={handleCopy}>
          Copy
        </button>
        <button type="button" className={`${btnGhost} text-xs !py-1 !px-2`} onClick={handleExport}>
          Export
        </button>
      </div>
      <div className="flex-1 overflow-auto text-xs p-2 min-h-0">
        {filtered.map((e, i) => (
          <div key={i} className="flex gap-2 text-gray-200">
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
