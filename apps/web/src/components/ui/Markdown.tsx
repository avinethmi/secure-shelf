import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Deliberately small markdown renderer for policy text: headings, paragraphs, bullet and
// numbered lists, bold, italic and inline code. Everything is emitted as React elements from
// plain strings, so there is no HTML injection path and no third-party parser to keep patched.

type Block = { kind: 'h'; level: 1 | 2 | 3; text: string } | { kind: 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);

    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      blocks.push({ kind: 'h', level: heading[1]!.length as 1 | 2 | 3, text: heading[2]! });
    } else if (bullet || numbered) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      const item = (bullet ?? numbered)![1]!;
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push(item);
    } else if (list && /^\s{2,}/.test(raw)) {
      // Indented continuation of the previous list item.
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return blocks;
}

// Inline: **bold**, *italic*, `code`. Tokens are split on a single regex so nesting is not
// attempted; policies do not need it.
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={cn('space-y-3 text-[15px] leading-relaxed text-fg', className)}>
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          if (b.level === 1) return <h2 key={i} className="text-2xl font-semibold tracking-tight">{renderInline(b.text)}</h2>;
          if (b.level === 2) return <h3 key={i} className="pt-3 text-lg font-semibold">{renderInline(b.text)}</h3>;
          return <h4 key={i} className="pt-1 text-base font-semibold">{renderInline(b.text)}</h4>;
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6 marker:text-accent">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-6 marker:text-fg-muted">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline((b as { kind: 'p'; text: string }).text)}</p>;
      })}
    </div>
  );
}
