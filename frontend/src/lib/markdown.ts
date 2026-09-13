import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "ol", "li", "blockquote", "hr", "br",
  "strong", "b", "em", "i", "u", "s", "del", "mark", "sub", "sup",
  "code", "pre", "img",
  "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "span", "div",
];

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "class"],
    img: ["src", "alt", "title", "loading", "width", "height", "class"],
    code: ["class"],
    span: ["class", "style"],
    p: ["style"],
    div: ["style", "class"],
    li: ["style"],
    h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], h5: ["style"], h6: ["style"],
    "*": ["id"],
  },
  allowedStyles: {
    "*": {
      "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      "text-align": [/^(left|right|center|justify)$/],
      "color": [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\([\d\s,]+\)$/],
    },
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.href?.startsWith("http")
        ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
        : attribs,
    }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
};

// Heuristic: does this content already contain block-level HTML from the rich editor?
function looksLikeHtml(s: string): boolean {
  return /^\s*<(?:p|h[1-6]|ul|ol|blockquote|pre|figure|div|img|span|strong|b|em|i|u|s|a)\b/i.test(s.trim());
}

// Convert Markdown source to sanitized HTML (used to migrate legacy posts).
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md ?? "", { async: false }) as string;
  return sanitizeHtml(rawHtml, SANITIZE_OPTS);
}

// Render post body: rich-editor HTML passes through sanitize; legacy Markdown is converted first.
export function renderContent(content: string): string {
  const c = content ?? "";
  if (looksLikeHtml(c)) return sanitizeHtml(c, SANITIZE_OPTS);
  return renderMarkdown(c);
}

// Sanitized HTML suitable for seeding the editable area (legacy Markdown -> HTML).
export function toEditableHtml(content: string): string {
  return renderContent(content);
}

function stripTags(s: string): string {
  return (s ?? "").replace(/<[^>]+>/g, " ");
}

export function readingTime(content: string): number {
  const words = stripTags(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function makeExcerpt(content: string, len = 160): string {
  const text = stripTags(content ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? text.slice(0, len).trimEnd() + "…" : text;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
