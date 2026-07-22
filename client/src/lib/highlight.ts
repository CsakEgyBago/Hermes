export interface TextRange {
  start: number;
  end: number;
}

export function findQuoteRanges(text: string, quotes: string[]): TextRange[] {
  const ranges: TextRange[] = [];
  for (const quote of quotes) {
    if (!quote) continue;
    const start = text.indexOf(quote);
    if (start === -1) continue;
    ranges.push({ start, end: start + quote.length });
  }

  ranges.sort((a, b) => a.start - b.start);

  const merged: TextRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

export function splitIntoSegments(text: string, quotes: string[]): TextSegment[] {
  const ranges = findQuoteRanges(text, quotes);
  if (ranges.length === 0) return [{ text, highlighted: false }];

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) segments.push({ text: text.slice(cursor, r.start), highlighted: false });
    segments.push({ text: text.slice(r.start, r.end), highlighted: true });
    cursor = r.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
  return segments;
}
