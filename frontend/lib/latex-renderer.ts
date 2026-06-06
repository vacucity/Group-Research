import katex from "katex";

/**
 * Render a basic LaTeX document to HTML.
 * Handles: sections, text formatting, math (inline $$ and block $$$$),
 * environments (abstract, itemize, enumerate), and common commands.
 */
export function renderLatexToHtml(source: string): string {
  if (!source.trim()) return "";

  let html = source;

  // 1. Escape HTML in non-math parts (we'll restore math later)
  // Extract math blocks to protect them from HTML escaping
  const mathBlocks: string[] = [];
  const mathInlines: string[] = [];

  // Protect display math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    const idx = mathBlocks.length;
    try {
      mathBlocks.push(
        katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        })
      );
    } catch {
      mathBlocks.push(`<code class="text-red-500">${escapeHtml(formula)}</code>`);
    }
    return `__MATH_BLOCK_${idx}__`;
  });

  // Protect inline math $...$
  html = html.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
    const idx = mathInlines.length;
    try {
      mathInlines.push(
        katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        })
      );
    } catch {
      mathInlines.push(`<code class="text-red-500">${escapeHtml(formula)}</code>`);
    }
    return `__MATH_INLINE_${idx}__`;
  });

  // 2. Now escape HTML in the remaining text
  html = escapeHtml(html);

  // 3. Render LaTeX sectioning commands
  html = html.replace(
    /\\section\s*\{([^}]*)\}/g,
    '<h2 class="text-xl font-bold mt-8 mb-3 pb-1 border-b border-gray-200">$1</h2>'
  );
  html = html.replace(
    /\\subsection\s*\{([^}]*)\}/g,
    '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>'
  );
  html = html.replace(
    /\\subsubsection\s*\{([^}]*)\}/g,
    '<h4 class="text-base font-medium mt-4 mb-1">$1</h4>'
  );

  // 4. Text formatting
  html = html.replace(/\\textbf\s*\{([^}]*)\}/g, "<strong>$1</strong>");
  html = html.replace(/\\textit\s*\{([^}]*)\}/g, "<em>$1</em>");
  html = html.replace(/\\texttt\s*\{([^}]*)\}/g, "<code>$1</code>");
  html = html.replace(/\\underline\s*\{([^}]*)\}/g, '<span class="underline">$1</span>');
  html = html.replace(/\\emph\s*\{([^}]*)\}/g, "<em>$1</em>");

  // 5. Title / author / date
  html = html.replace(
    /\\title\s*\{([^}]*)\}/g,
    '<h1 class="text-2xl font-bold text-center mt-4 mb-2">$1</h1>'
  );
  html = html.replace(
    /\\author\s*\{([^}]*)\}/g,
    '<p class="text-center text-sm text-[var(--muted-foreground)] mb-1">$1</p>'
  );
  html = html.replace(
    /\\date\s*\{([^}]*)\}/g,
    '<p class="text-center text-xs text-[var(--muted-foreground)] mb-4">$1</p>'
  );
  html = html.replace(/\\maketitle/g, "");

  // 6. Environments: abstract
  html = html.replace(
    /\s*\\begin\s*\{abstract\}\s*([\s\S]*?)\s*\\end\s*\{abstract\}\s*/g,
    '<div class="bg-gray-50 border-l-4 border-[var(--primary)] px-4 py-2 my-4 text-sm italic">$1</div>'
  );

  // 7. Environments: itemize (unordered list)
  html = html.replace(
    /\s*\\begin\s*\{itemize\}\s*([\s\S]*?)\s*\\end\s*\{itemize\}\s*/g,
    (_, body) => {
      const items = body
        .split(/\\item\s*/)
        .filter((s: string) => s.trim());
      const listItems = items
        .map((item: string) => `<li class="ml-4 list-disc">${item.trim()}</li>`)
        .join("\n");
      return `<ul class="my-3 space-y-1">\n${listItems}\n</ul>`;
    }
  );

  // 8. Environments: enumerate (ordered list)
  html = html.replace(
    /\s*\\begin\s*\{enumerate\}\s*([\s\S]*?)\s*\\end\s*\{enumerate\}\s*/g,
    (_, body) => {
      const items = body
        .split(/\\item\s*/)
        .filter((s: string) => s.trim());
      const listItems = items
        .map((item: string) => `<li class="ml-4 list-decimal">${item.trim()}</li>`)
        .join("\n");
      return `<ol class="my-3 space-y-1">\n${listItems}\n</ol>`;
    }
  );

  // 9. Clean up remaining LaTeX commands (strip braces from \usepackage etc.)
  html = html.replace(/\\usepackage\s*\{[^}]*\}/g, "");
  html = html.replace(/\\documentclass\s*(\[[^\]]*\])?\s*\{[^}]*\}/g, "");
  html = html.replace(/\\begin\s*\{document\}\s*/g, "");
  html = html.replace(/\s*\\end\s*\{document\}\s*/g, "");

  // 10. Paragraph breaks — double newlines
  html = html
    .split(/\n{2,}/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      // Don't wrap already-tagged blocks
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<p")
      ) {
        return trimmed;
      }
      return `<p class="mb-2">${trimmed}</p>`;
    })
    .join("\n");

  // 11. Restore math blocks
  html = html.replace(/__MATH_BLOCK_(\d+)__/g, (_, i) => mathBlocks[+i] || "");
  html = html.replace(/__MATH_INLINE_(\d+)__/g, (_, i) => mathInlines[+i] || "");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
