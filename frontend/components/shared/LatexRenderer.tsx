"use client";

import { useMemo } from "react";
import { marked } from "marked";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  className?: string;
}

export function LatexRenderer({ text, className }: Props) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function PlainText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return (
    <pre className={`whitespace-pre-wrap font-sans ${className || ""}`}>
      {safe}
    </pre>
  );
}

// ── Internal rendering ──

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function katexOrCode(f: string, display: boolean): string {
  try {
    return katex.renderToString(f.trim(), {
      displayMode: display,
      throwOnError: false,
      trust: true,
    });
  } catch {
    return `<code>${escape(f)}</code>`;
  }
}

// Use HTML-safe placeholder markers (won't be touched by HTML escaping or marked parsing)
const PLACEHOLDER_PREFIX = "￼";

function renderMarkdown(text: string): string {
  // Step 0: Normalize — collapse spaces between CJK characters
  let t = text.replace(/([一-鿿])\s+([一-鿿])/g, "$1$2");

  // Step 1: Extract LaTeX math → safe placeholders
  const blocks: [string, string][] = [];
  let id = 0;

  const save = (f: string, display: boolean): string => {
    const key = `${PLACEHOLDER_PREFIX}${id++}${PLACEHOLDER_PREFIX}`;
    blocks.push([key, katexOrCode(f, display)]);
    return key;
  };

  // Display math: $$...$$ and \[...\]
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_, f) => save(f, true));
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => save(f, true));

  // Inline math: \(...\)
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => save(f, false));

  // Inline math: $...$ (non-greedy, skip currency)
  t = t.replace(/\$([^$\n]+?)\$/g, (_, f) => {
    if (/^\d/.test(f.trim())) return `$${f}$`; // skip currency like $30
    return save(f, false);
  });

  // Step 2: Parse Markdown → HTML using marked
  let html: string;
  try {
    html = marked.parse(t, {
      gfm: true,
      breaks: false,
    }) as string;

    // If marked returned nothing useful, fall back
    if (!html || html.trim().length === 0) {
      html = fallbackRender(t);
    }
  } catch {
    html = fallbackRender(t);
  }

  // Step 3: Restore LaTeX math placeholders
  for (const [k, v] of blocks) {
    html = html.split(k).join(v);
  }

  return html;
}

/** Basic fallback when marked fails — still preserves paragraph structure */
function fallbackRender(t: string): string {
  return escape(t)
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin-bottom:0.5rem">${p.replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
}
