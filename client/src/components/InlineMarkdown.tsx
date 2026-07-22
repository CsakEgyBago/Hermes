import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const inlineMarkdownComponents: Components = {
  p: ({ children }) => <>{children}</>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-indigo-400 underline hover:text-indigo-300"
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-900 px-1 py-0.5 text-xs text-indigo-300">{children}</code>
  ),
};

export function InlineMarkdown({ children }: { children: string }) {
  return <ReactMarkdown components={inlineMarkdownComponents}>{children}</ReactMarkdown>;
}
