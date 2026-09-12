import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "ol", "li", "blockquote", "hr", "br",
  "strong", "em", "del", "code", "pre", "img",
  "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "span",
];

export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md ?? "", { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading", "width", "height"],
      code: ["class"],
      span: ["class"],
      "*": ["id"],
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
  });
}

export function readingTime(md: string): number {
  const words = (md ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function makeExcerpt(md: string, len = 160): string {
  const text = (md ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
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
