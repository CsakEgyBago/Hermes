import { remark } from "remark";
import stripMarkdown from "strip-markdown";

// A heading or fenced code block is unambiguous enough on its own. Everything
// else (lists, bold, inline code, links, blockquotes) is common in ordinary
// prose too, so we only call it Markdown once two of those show up together.
const STRONG_SIGNALS: RegExp[] = [
  /^#{1,6}\s+\S/m, // headings
  /```/, // fenced code block
];

const WEAK_SIGNALS: RegExp[] = [
  /^[-*+]\s+\S/m, // bullet lists
  /^\d+\.\s+\S/m, // numbered lists
  /\*\*[^*\n]+\*\*/, // bold
  /`[^`\n]+`/, // inline code
  /\[[^\]]+\]\([^)]+\)/, // links
  /^>\s+\S/m, // blockquote
];

export function looksLikeMarkdown(text: string): boolean {
  if (!text.trim()) return false;
  if (STRONG_SIGNALS.some((pattern) => pattern.test(text))) return true;
  return WEAK_SIGNALS.filter((pattern) => pattern.test(text)).length >= 2;
}

export function markdownToPlainText(markdown: string): string {
  const file = remark().use(stripMarkdown).processSync(markdown);
  return String(file).trim();
}

export function countHeadings(text: string): number {
  return (text.match(/^#{1,6}\s+\S/gm) ?? []).length;
}

export interface HeadingSection {
  heading: string;
  content: string;
}

export function splitByHeadings(text: string): HeadingSection[] {
  const lines = text.split("\n");
  const sections: HeadingSection[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content.length > 0) sections.push({ heading: currentHeading, content });
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2].trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}
