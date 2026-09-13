// Client logic for the admin Post editor (Article + Gallery).
// Medium-style rich text editing on a contenteditable surface; content is saved as HTML.
// Features: formatting toolbar, "/" slash command menu, rich link-preview cards, quiet autosave.
const dataEl = document.getElementById("editor-data");
const initial: any = dataEl && dataEl.textContent ? JSON.parse(dataEl.textContent) : {};

  const state = { id: initial.id };
  const $ = (id) => document.getElementById(id);
  const msg = $("editor-status-msg");
  const badge = $("status-badge");
  const editor = $("f-content");

  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* older browsers */ }

  function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  }
  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function domainOf(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
  }
  // Parse a fetch Response as JSON, but degrade gracefully when a proxy returns
  // plain text/HTML (e.g. a CSRF or gateway error) so we never throw a cryptic
  // "Unexpected token" at the user.
  async function readJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      const snippet = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
      return { error: snippet || `Request failed (${res.status}).` };
    }
  }

  // Auto-fill slug from title until the user edits the slug manually.
  let slugTouched = Boolean(initial.slug);
  $("f-slug").addEventListener("input", () => { slugTouched = true; });
  $("f-title").addEventListener("input", (e) => {
    if (!slugTouched) $("f-slug").value = slugify(e.target.value);
  });

  function showMsg(text, ok = true) {
    msg.textContent = text;
    msg.className = `text-xs text-center ${ok ? "text-teal-300" : "text-red-400"}`;
  }

  let currentType = initial.type === "gallery" || initial.type === "photo" ? "gallery" : "article";
  let images = Array.isArray(initial.images)
    ? initial.images.map((im) => ({ url: im.url, caption: im.caption || "" }))
    : [];

  // Serialize a cleaned copy of the editor: strip drag/edit affordances so stored HTML stays tidy.
  function cleanContent() {
    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-rte-control]").forEach((n) => n.remove());
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    clone.querySelectorAll(".link-card-desc").forEach((n) => { if (!(n.textContent || "").trim()) n.remove(); });
    clone.querySelectorAll(".link-card-loading").forEach((n) => n.classList.remove("link-card-loading"));
    clone.querySelectorAll("[data-enhanced]").forEach((n) => n.removeAttribute("data-enhanced"));
    clone.querySelectorAll("[data-placeholder-desc]").forEach((n) => n.removeAttribute("data-placeholder-desc"));
    clone.querySelectorAll(".rte-dragging").forEach((n) => n.classList.remove("rte-dragging"));
    clone.querySelectorAll("[id^='lc-']").forEach((n) => n.removeAttribute("id"));
    return clone.innerHTML.trim();
  }

  function plainText() {
    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-rte-control]").forEach((n) => n.remove());
    return (clone.textContent || "").replace(/\u200B/g, "").trim();
  }

  // Read editor HTML; treat visually-empty content as an empty string.
  function getContentHtml() {
    if (!plainText() && !editor.querySelector("img, .link-card")) return "";
    return cleanContent();
  }

  function collect(status) {
    return {
      title: $("f-title").value.trim(),
      slug: $("f-slug").value.trim() || undefined,
      excerpt: $("f-excerpt").value.trim(),
      content: getContentHtml(),
      coverImage: $("f-cover-url").value.trim() || null,
      type: currentType,
      images,
      status,
      tags: $("f-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    };
  }

  // ---- Post type toggle ----
  function applyType() {
    const gallery = currentType === "gallery";
    $("gallery-manager").classList.toggle("hidden", !gallery);
    $("content-label").textContent = gallery ? "Intro text (optional)" : "Content";
    editor.classList.toggle("min-h-[180px]", gallery);
    editor.classList.toggle("min-h-[420px]", !gallery);
    document.querySelectorAll(".type-btn").forEach((b) => {
      const active = b.dataset.type === currentType;
      b.classList.toggle("bg-teal-500/20", active);
      b.classList.toggle("text-teal-200", active);
      b.classList.toggle("text-retro-50/70", !active);
    });
  }
  document.querySelectorAll(".type-btn").forEach((b) => {
    b.addEventListener("click", () => { currentType = b.dataset.type; applyType(); scheduleAutosave(); });
  });

  // ---- Selection helpers ----
  let savedRange = null;
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0);
  }
  function restoreSelection() {
    const sel = window.getSelection();
    if (savedRange && sel) { sel.removeAllRanges(); sel.addRange(savedRange); }
  }
  editor.addEventListener("keyup", saveSelection);
  editor.addEventListener("mouseup", saveSelection);
  editor.addEventListener("focus", saveSelection);

  // Keep the editor structured around block-level paragraphs so caret text never
  // ends up as bare text nodes at the root (which breaks Enter + slash commands).
  function updatePlaceholder() {
    const empty = !(editor.textContent || "").trim() && !editor.querySelector("img, .link-card, hr");
    editor.classList.toggle("is-empty", empty);
  }
  function ensureParagraph() {
    if (editor.childElementCount === 0 && !(editor.textContent || "").trim()) {
      editor.innerHTML = "<p><br></p>";
      const p = editor.firstElementChild;
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(p); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
      savedRange = r;
    }
  }
  editor.addEventListener("focus", ensureParagraph);
  updatePlaceholder();

  function selectionInEditor() {
    const sel = window.getSelection();
    return !!(sel && sel.rangeCount && editor.contains(sel.anchorNode));
  }

  function exec(command, value = null) {
    editor.focus();
    if (!selectionInEditor()) restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    updateToolbarState();
    scheduleAutosave();
  }

  function wrapSelection(tagName, style) {
    editor.focus();
    if (!selectionInEditor()) restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const el = document.createElement(tagName);
    if (style) Object.assign(el.style, style);
    try {
      el.appendChild(range.extractContents());
      range.insertNode(el);
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(el);
      sel.addRange(r);
      savedRange = r;
      updateToolbarState();
      scheduleAutosave();
    } catch { /* selection spanned block boundaries; ignore */ }
  }

  // Toggle inline <code>: unwrap when the caret/selection is already inside code, else wrap.
  function toggleInlineCode() {
    editor.focus();
    if (!selectionInEditor()) restoreSelection();
    const code = closestTag("CODE");
    if (!code) { wrapSelection("code"); return; }
    const parent = code.parentNode;
    if (!parent) return;
    const frag = document.createDocumentFragment();
    while (code.firstChild) frag.appendChild(code.firstChild);
    const first = frag.firstChild;
    const last = frag.lastChild;
    parent.replaceChild(frag, code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    const r = document.createRange();
    if (first && last) { r.setStartBefore(first); r.setEndAfter(last); }
    else { r.selectNodeContents(parent); r.collapse(true); }
    sel.addRange(r);
    savedRange = r;
    if (parent.normalize) parent.normalize();
    updateToolbarState();
    scheduleAutosave();
  }

  // ---- Toolbar active-state feedback ----
  function closestTag(tag) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let n: any = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentNode;
    while (n && n !== editor) { if (n.tagName === tag) return n; n = n.parentNode; }
    return null;
  }
  function currentFormatBlockTag() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let n: any = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentNode;
    const tags = ["P", "H1", "H2", "H3", "BLOCKQUOTE", "PRE"];
    while (n && n !== editor) { if (tags.includes(n.tagName)) return n.tagName.toLowerCase(); n = n.parentNode; }
    return null;
  }
  function currentFontSize() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return "";
    let n: any = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentNode;
    while (n && n !== editor) { if (n.style && n.style.fontSize) return n.style.fontSize; n = n.parentNode; }
    return "";
  }
  function currentColor(prop) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return "";
    let n: any = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentNode;
    while (n && n !== editor) { if (n.style && n.style[prop]) return n.style[prop]; n = n.parentNode; }
    return "";
  }
  const STATE_CMDS = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
  function updateToolbarState() {
    const inEditor = selectionInEditor();
    document.querySelectorAll("#rte-toolbar [data-cmd]").forEach((b: any) => {
      const cmd = b.dataset.cmd;
      let active = false;
      if (inEditor) {
        if (cmd === "inlineCode") active = !!closestTag("CODE");
        else if (STATE_CMDS.includes(cmd)) { try { active = document.queryCommandState(cmd); } catch { active = false; } }
      }
      b.classList.toggle("active", active);
    });
    if (inEditor) {
      const blk = currentFormatBlockTag();
      if (blk) blockSelect.value = blk;
      const fs = currentFontSize();
      const match = Array.from(sizeSelect.options).some((o: any) => o.value === fs);
      sizeSelect.value = match ? fs : "";
    }
    blockSelect.classList.toggle("is-set", blockSelect.value !== "p");
    sizeSelect.classList.toggle("is-set", !!sizeSelect.value);
    // Reflect text / highlight colors on their swatch triggers.
    document.querySelectorAll("#rte-toolbar .rte-color").forEach((btn: any) => {
      const isText = btn.dataset.color === "text";
      const cur = inEditor ? currentColor(isText ? "color" : "backgroundColor") : "";
      const bar = btn.querySelector("[data-color-bar]");
      if (bar) bar.style.background = cur || (isText ? "#6fe39a" : "#f6c453");
      btn.classList.toggle("is-set", inEditor && !!cur);
    });
  }

  // Nearest block element that is a direct-ish child of the editor and holds the caret.
  function getCurrentBlock() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node: any = sel.anchorNode;
    if (!node || !editor.contains(node)) return null;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node !== editor && node.parentNode !== editor) node = node.parentNode;
    return node === editor ? editor : node;
  }

  // ---- Toolbar ----
  document.querySelectorAll("#rte-toolbar [data-cmd]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => { e.preventDefault(); saveSelection(); });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd === "createLink") {
        const url = prompt("Link URL:", "https://");
        if (url) exec("createLink", url);
      } else if (cmd === "inlineCode") {
        toggleInlineCode();
      } else {
        exec(cmd);
      }
    });
  });

  const blockSelect = $("rte-block");
  blockSelect.addEventListener("mousedown", saveSelection);
  blockSelect.addEventListener("change", () => {
    const tag = blockSelect.value;
    exec("formatBlock", tag === "p" ? "P" : tag.toUpperCase());
  });

  const sizeSelect = $("rte-size");
  sizeSelect.addEventListener("mousedown", saveSelection);
  sizeSelect.addEventListener("change", () => { applyFontSize(sizeSelect.value); });

  // Apply a font size to the current selection, or to the whole block when the caret is collapsed.
  function applyFontSize(size) {
    editor.focus();
    if (!selectionInEditor()) restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      if (size) wrapSelection("span", { fontSize: size });
    } else {
      const block = getCurrentBlock();
      if (block && block !== editor) {
        if (size) block.style.fontSize = size;
        else block.style.removeProperty("font-size");
        scheduleAutosave();
      }
    }
    updateToolbarState();
  }

  // Reflect the caret's current formatting in the toolbar (active buttons + dropdown values).
  document.addEventListener("selectionchange", () => { if (selectionInEditor()) updateToolbarState(); });
  editor.addEventListener("keyup", updateToolbarState);
  editor.addEventListener("mouseup", updateToolbarState);
  editor.addEventListener("focus", updateToolbarState);

  // ---- Text color + highlight ----
  function applyColor(kind, value) {
    const prop = kind === "text" ? "color" : "backgroundColor";
    const cssProp = kind === "text" ? "color" : "background-color";
    editor.focus();
    if (!selectionInEditor()) restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const style: any = {};
      style[prop] = value || "inherit";
      wrapSelection("span", style);
    } else {
      const block = getCurrentBlock();
      if (block && block !== editor) {
        if (value) block.style[prop] = value;
        else block.style.removeProperty(cssProp);
        scheduleAutosave();
      }
    }
    updateToolbarState();
  }

  const TEXT_COLORS = ["#ffffff", "#6fe39a", "#5dd1c1", "#8ab4f8", "#c58af9", "#f6c453", "#f28b82", "#9aa0a6"];
  const HL_COLORS = ["rgba(111,227,154,0.35)", "rgba(93,209,193,0.35)", "rgba(138,180,248,0.35)", "rgba(197,138,249,0.35)", "rgba(246,196,83,0.35)", "rgba(242,139,130,0.35)", "rgba(255,255,255,0.22)"];
  let colorPop: any = null;
  let colorPopKind: any = null;
  function ensureColorPop() {
    if (colorPop) return colorPop;
    colorPop = document.createElement("div");
    colorPop.className = "color-pop";
    colorPop.dataset.testid = "color-pop";
    document.body.appendChild(colorPop);
    return colorPop;
  }
  function renderColorPop(kind) {
    const pop = ensureColorPop();
    pop.innerHTML = "";
    (kind === "text" ? TEXT_COLORS : HL_COLORS).forEach((c) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "color-swatch";
      sw.style.background = c;
      sw.title = c;
      sw.dataset.testid = "color-swatch";
      sw.addEventListener("mousedown", (e) => { e.preventDefault(); applyColor(kind, c); closeColorPop(); });
      pop.appendChild(sw);
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "color-swatch is-clear";
    clear.title = "Clear";
    clear.dataset.testid = "color-clear";
    clear.addEventListener("mousedown", (e) => { e.preventDefault(); applyColor(kind, ""); closeColorPop(); });
    pop.appendChild(clear);
  }
  function openColorPop(kind, btn) {
    colorPopKind = kind;
    renderColorPop(kind);
    const pop = ensureColorPop();
    const r = btn.getBoundingClientRect();
    pop.style.top = `${Math.min(r.bottom + 6, window.innerHeight - 140)}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 200))}px`;
    pop.classList.add("open");
  }
  function closeColorPop() { if (colorPop) colorPop.classList.remove("open"); colorPopKind = null; }
  document.querySelectorAll("#rte-toolbar .rte-color").forEach((btn: any) => {
    btn.addEventListener("mousedown", (e) => { e.preventDefault(); saveSelection(); });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const kind = btn.dataset.color;
      if (colorPopKind === kind && colorPop && colorPop.classList.contains("open")) { closeColorPop(); return; }
      openColorPop(kind, btn);
    });
  });
  document.addEventListener("mousedown", (e: any) => {
    if (colorPop && colorPop.classList.contains("open") && !colorPop.contains(e.target) && !(e.target.closest && e.target.closest(".rte-color"))) closeColorPop();
  });
  document.addEventListener("scroll", () => closeColorPop(), true);

  // ---- Keyboard shortcut feedback (Ctrl/Cmd + B / I / U) ----
  editor.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const cmd = ({ b: "bold", i: "italic", u: "underline" } as any)[e.key.toLowerCase()];
    if (!cmd) return;
    // Let the browser apply the native command, then reflect state + pulse the button.
    requestAnimationFrame(() => {
      saveSelection();
      updateToolbarState();
      const btn = document.querySelector(`#rte-toolbar [data-cmd="${cmd}"]`) as HTMLElement | null;
      if (btn) { btn.classList.remove("rte-pulse"); void btn.offsetWidth; btn.classList.add("rte-pulse"); }
    });
  });

  // ---- Sticky toolbar shadow when pinned ----
  const toolbarEl = $("rte-toolbar");
  if (toolbarEl && "IntersectionObserver" in window) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "height:1px;width:100%;";
    toolbarEl.parentElement.insertBefore(sentinel, toolbarEl);
    new IntersectionObserver(
      ([entry]) => toolbarEl.classList.toggle("is-stuck", entry.intersectionRatio === 0),
      { threshold: [0, 1], rootMargin: "-56px 0px 0px 0px" }
    ).observe(sentinel);
  }

  // ---- Keyboard shortcut cheatsheet ("?" or the help button) ----
  const IS_MAC = /Mac|iPhone|iPad/i.test((navigator as any).platform || navigator.userAgent);
  const MOD = IS_MAC ? "\u2318" : "Ctrl";
  const SHORTCUTS = [
    { label: "Bold", keys: [MOD, "B"] },
    { label: "Italic", keys: [MOD, "I"] },
    { label: "Underline", keys: [MOD, "U"] },
    { label: "Open block menu", keys: ["/"] },
    { label: "Emoji picker", keys: [":"] },
    { label: "Paste a link \u2192 rich card", keys: [MOD, "V"] },
    { label: "Next / previous table cell", keys: ["Tab", "\u21E7 Tab"] },
    { label: "Add row (in last table cell)", keys: ["Tab"] },
    { label: "Close menu / dialog", keys: ["Esc"] },
    { label: "Show this cheatsheet", keys: ["?"] },
  ];
  let helpModal: any = null;
  function buildHelp() {
    if (helpModal) return helpModal;
    helpModal = document.createElement("div");
    helpModal.className = "rte-help-modal";
    helpModal.dataset.testid = "rte-help-modal";
    const rows = SHORTCUTS.map((s) =>
      `<div class="rte-help-row"><span class="rte-help-label">${escapeHtml(s.label)}</span>` +
      `<span class="rte-help-keys">${s.keys.map((k) => `<kbd class="rte-kbd">${escapeHtml(k)}</kbd>`).join("")}</span></div>`
    ).join("");
    helpModal.innerHTML =
      `<div class="rte-help-backdrop" data-help-close></div>` +
      `<div class="rte-help-panel" role="dialog" aria-label="Keyboard shortcuts">` +
      `<h3>Keyboard shortcuts` +
      `<button type="button" class="rte-btn rte-help-close" data-help-close title="Close" data-testid="rte-help-close">` +
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg></button></h3>` +
      rows + `</div>`;
    document.body.appendChild(helpModal);
    helpModal.querySelectorAll("[data-help-close]").forEach((el) => el.addEventListener("click", closeHelp));
    return helpModal;
  }
  function openHelp() { buildHelp().classList.add("open"); }
  function closeHelp() { if (helpModal) helpModal.classList.remove("open"); }
  $("btn-help").addEventListener("click", (e) => { e.preventDefault(); buildHelp().classList.toggle("open"); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpModal && helpModal.classList.contains("open")) { e.preventDefault(); closeHelp(); return; }
    if (e.key !== "?") return;
    const t: any = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    e.preventDefault();
    openHelp();
  });

  // ---- Slash command menu ----
  function makeEl(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstElementChild;
  }
  function placeCaret(node) {
    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStart(node, 0);
    r.collapse(true);
    sel.addRange(r);
    savedRange = r;
  }
  // Replace the caret's block with a fresh structure (predictable, unlike execCommand lists).
  function slashBlock(block, html, caretSel) {
    const el = makeEl(html);
    block.replaceWith(el);
    const caret = caretSel ? el.querySelector(caretSel) : el;
    placeCaret(caret || el);
    updatePlaceholder();
    scheduleAutosave();
  }
  function insertTable(block) {
    const cols = 3, rows = 2;
    let html = "<table><thead><tr>";
    for (let c = 0; c < cols; c++) html += "<th><br></th>";
    html += "</tr></thead><tbody>";
    for (let r = 0; r < rows; r++) { html += "<tr>"; for (let c = 0; c < cols; c++) html += "<td><br></td>"; html += "</tr>"; }
    html += "</tbody></table>";
    const table = makeEl(html);
    const p = makeEl("<p><br></p>");
    block.replaceWith(table);
    table.after(p);
    placeCaret(table.querySelector("th"));
    updatePlaceholder();
    scheduleAutosave();
  }
  function getCurrentCell() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let n: any = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentNode;
    while (n && n !== editor) { if (n.tagName === "TD" || n.tagName === "TH") return n; n = n.parentNode; }
    return null;
  }
  function addTableRow(table) {
    const tbody = table.querySelector("tbody") || table;
    const cols = table.querySelector("tr").children.length;
    const tr = document.createElement("tr");
    for (let c = 0; c < cols; c++) { const td = document.createElement("td"); td.innerHTML = "<br>"; tr.appendChild(td); }
    tbody.appendChild(tr);
    scheduleAutosave();
    return tr;
  }
  const SLASH_COMMANDS = [
    { key: "H1", title: "Heading 1", desc: "Large section title", kw: "h1 title heading big", run: (b) => slashBlock(b, "<h1><br></h1>") },
    { key: "H2", title: "Heading 2", desc: "Medium section title", kw: "h2 subtitle heading", run: (b) => slashBlock(b, "<h2><br></h2>") },
    { key: "H3", title: "Heading 3", desc: "Small section title", kw: "h3 heading", run: (b) => slashBlock(b, "<h3><br></h3>") },
    { key: "P", title: "Text", desc: "Plain paragraph", kw: "p text paragraph body", run: (b) => slashBlock(b, "<p><br></p>") },
    { key: "\u201C", title: "Quote", desc: "Blockquote", kw: "quote blockquote", run: (b) => slashBlock(b, "<blockquote><br></blockquote>") },
    { key: "</>", title: "Code block", desc: "Monospace block", kw: "code pre snippet", run: (b) => slashBlock(b, "<pre><br></pre>") },
    { key: "\u2022", title: "Bullet list", desc: "Unordered list", kw: "ul bullet list unordered", run: (b) => slashBlock(b, "<ul><li></li></ul>", "li") },
    { key: "1.", title: "Numbered list", desc: "Ordered list", kw: "ol number ordered list", run: (b) => slashBlock(b, "<ol><li></li></ol>", "li") },
    { key: "\u25A6", title: "Table", desc: "3-column table (Tab adds rows)", kw: "table grid rows columns", run: (b) => insertTable(b) },
    { key: "\u2014", title: "Divider", desc: "Horizontal rule", kw: "hr divider rule line separator", run: (b) => { const hr = makeEl("<hr>"); const p = makeEl("<p><br></p>"); b.replaceWith(hr); hr.after(p); placeCaret(p); scheduleAutosave(); } },
    { key: "\uD83D\uDDBC", title: "Image", desc: "Upload from your device", kw: "image img photo picture upload", run: (b) => { placeCaret(b); $("f-inline-image").click(); } },
    { key: "\uD83D\uDD0D", title: "Unsplash photo", desc: "Search free stock photos", kw: "unsplash photo stock image search", run: (b) => { placeCaret(b); openUnsplash(); } },
  ];
  let slashMenu = null;
  let slashOpen = false;
  let slashItems = [];
  let slashActive = 0;

  function ensureMenu() {
    if (slashMenu) return slashMenu;
    slashMenu = document.createElement("div");
    slashMenu.className = "slash-menu";
    slashMenu.dataset.testid = "slash-menu";
    slashMenu.style.display = "none";
    document.body.appendChild(slashMenu);
    return slashMenu;
  }

  function renderMenu() {
    const m = ensureMenu();
    m.innerHTML = "";
    if (!slashItems.length) {
      const e = document.createElement("div");
      e.className = "slash-empty";
      e.textContent = "No matching blocks";
      m.appendChild(e);
      return;
    }
    slashItems.forEach((cmd, i) => {
      const row = document.createElement("div");
      row.className = `slash-item${i === slashActive ? " active" : ""}`;
      row.dataset.testid = "slash-item";
      row.innerHTML = `<span class="slash-ico">${escapeHtml(cmd.key)}</span><span class="slash-text"><span class="slash-title">${escapeHtml(cmd.title)}</span><span class="slash-desc">${escapeHtml(cmd.desc)}</span></span>`;
      row.addEventListener("mousedown", (e) => { e.preventDefault(); chooseSlash(i); });
      m.appendChild(row);
    });
  }

  function positionMenu() {
    const m = ensureMenu();
    const sel = window.getSelection();
    let rect = null;
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r && (r.width || r.height || r.top)) rect = r;
    }
    if (!rect) { const b = getCurrentBlock(); rect = b && b.getBoundingClientRect ? b.getBoundingClientRect() : editor.getBoundingClientRect(); }
    const top = Math.min(rect.bottom + 6, window.innerHeight - 320);
    const left = Math.min(rect.left, window.innerWidth - 280);
    m.style.top = `${Math.max(8, top)}px`;
    m.style.left = `${Math.max(8, left)}px`;
  }

  function openSlash(query) {
    const q = query.toLowerCase();
    slashItems = SLASH_COMMANDS.filter((c) => !q || c.title.toLowerCase().includes(q) || c.kw.includes(q));
    slashActive = 0;
    renderMenu();
    positionMenu();
    ensureMenu().style.display = "block";
    slashOpen = true;
  }
  function closeSlash() {
    if (slashMenu) slashMenu.style.display = "none";
    slashOpen = false;
  }
  function chooseSlash(i) {
    const cmd = slashItems[i];
    if (!cmd) return;
    closeSlash();
    let block = getCurrentBlock();
    if (!block || block === editor) { ensureParagraph(); block = getCurrentBlock(); }
    if (!block || block === editor) return;
    block.textContent = ""; // remove the "/query" text
    cmd.run(block);
  }

  function maybeSlash() {
    if (!editor.contains(document.activeElement) && document.activeElement !== editor) { /* still ok */ }
    const block = getCurrentBlock();
    const text = block ? (block.textContent || "") : "";
    const m = text.match(/^\/(\w*)$/);
    if (m) openSlash(m[1]);
    else closeSlash();
  }

  editor.addEventListener("input", () => {
    const emoji = maybeEmoji();
    if (emoji) closeSlash();
    else maybeSlash();
    updatePlaceholder();
    enhanceEditor();
    scheduleAutosave();
  });
  editor.addEventListener("keydown", (e) => {
    if (!slashOpen) return;
    if (e.key === "ArrowDown") { e.preventDefault(); if (slashItems.length) { slashActive = (slashActive + 1) % slashItems.length; renderMenu(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (slashItems.length) { slashActive = (slashActive - 1 + slashItems.length) % slashItems.length; renderMenu(); } }
    else if (e.key === "Enter") { if (slashItems.length) { e.preventDefault(); chooseSlash(slashActive); } else closeSlash(); }
    else if (e.key === "Escape") { e.preventDefault(); closeSlash(); }
  });
  // Emoji ":" menu keyboard navigation.
  editor.addEventListener("keydown", (e) => {
    if (!emojiOpen) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); emojiActive = (emojiActive + 1) % emojiItems.length; renderEmoji(); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); emojiActive = (emojiActive - 1 + emojiItems.length) % emojiItems.length; renderEmoji(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); chooseEmoji(emojiActive); }
    else if (e.key === "Escape") { e.preventDefault(); closeEmoji(); }
  });
  // Table: Tab / Shift+Tab move between cells; Tab in the last cell adds a row.
  editor.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || emojiOpen || slashOpen) return;
    const cell = getCurrentCell();
    if (!cell) return;
    e.preventDefault();
    const table = cell.closest("table");
    const cells = Array.from(table.querySelectorAll("th,td"));
    const idx = cells.indexOf(cell);
    if (e.shiftKey) { if (idx > 0) placeCaret(cells[idx - 1]); return; }
    if (idx < cells.length - 1) { placeCaret(cells[idx + 1]); }
    else { addTableRow(table); placeCaret(table.querySelectorAll("th,td")[idx + 1]); }
  });
  document.addEventListener("scroll", () => { if (slashOpen) closeSlash(); if (emojiOpen) closeEmoji(); }, true);
  editor.addEventListener("blur", () => setTimeout(() => { closeSlash(); closeEmoji(); }, 150));

  // ---- Emoji ":" menu ----
  const EMOJI = [
    { c: "\uD83D\uDE00", n: "grinning", kw: "smile happy grin" },
    { c: "\uD83D\uDE01", n: "beaming", kw: "smile happy grin" },
    { c: "\uD83D\uDE02", n: "joy", kw: "laugh cry funny lol" },
    { c: "\uD83E\uDD23", n: "rofl", kw: "laugh rolling funny lol" },
    { c: "\uD83D\uDE03", n: "smiley", kw: "happy smile" },
    { c: "\uD83D\uDE04", n: "smile", kw: "happy grin" },
    { c: "\uD83D\uDE09", n: "wink", kw: "flirt" },
    { c: "\uD83D\uDE0A", n: "blush", kw: "happy smile" },
    { c: "\uD83D\uDE0D", n: "heart eyes", kw: "love like" },
    { c: "\uD83D\uDE18", n: "kiss", kw: "love" },
    { c: "\uD83D\uDE1C", n: "tongue", kw: "playful silly" },
    { c: "\uD83E\uDD14", n: "thinking", kw: "hmm think" },
    { c: "\uD83D\uDE10", n: "neutral", kw: "meh" },
    { c: "\uD83D\uDE44", n: "eye roll", kw: "annoyed" },
    { c: "\uD83D\uDE0E", n: "cool", kw: "sunglasses awesome" },
    { c: "\uD83E\uDD70", n: "smiling heart", kw: "love adore" },
    { c: "\uD83D\uDE22", n: "cry", kw: "sad tear" },
    { c: "\uD83D\uDE2D", n: "sob", kw: "cry sad bawl" },
    { c: "\uD83D\uDE20", n: "angry", kw: "mad" },
    { c: "\uD83D\uDE31", n: "scream", kw: "shock fear" },
    { c: "\uD83D\uDE33", n: "flushed", kw: "embarrassed" },
    { c: "\uD83E\uDD73", n: "party face", kw: "celebrate hooray" },
    { c: "\uD83D\uDE34", n: "sleep", kw: "tired zzz" },
    { c: "\uD83E\uDD2F", n: "mind blown", kw: "wow shock" },
    { c: "\uD83D\uDE07", n: "angel", kw: "innocent halo" },
    { c: "\uD83D\uDC4D", n: "thumbs up", kw: "yes like approve ok +1" },
    { c: "\uD83D\uDC4E", n: "thumbs down", kw: "no dislike -1" },
    { c: "\uD83D\uDC4F", n: "clap", kw: "applause bravo" },
    { c: "\uD83D\uDE4C", n: "raised hands", kw: "praise celebrate hooray" },
    { c: "\uD83D\uDC4B", n: "wave", kw: "hi hello bye" },
    { c: "\uD83D\uDCAA", n: "muscle", kw: "strong flex" },
    { c: "\uD83D\uDE4F", n: "pray", kw: "thanks please hope" },
    { c: "\u270C\uFE0F", n: "peace", kw: "victory" },
    { c: "\uD83E\uDD1D", n: "handshake", kw: "deal agree" },
    { c: "\u2764\uFE0F", n: "red heart", kw: "love like" },
    { c: "\uD83E\uDDE1", n: "orange heart", kw: "love" },
    { c: "\uD83D\uDC9B", n: "yellow heart", kw: "love" },
    { c: "\uD83D\uDC9A", n: "green heart", kw: "love" },
    { c: "\uD83D\uDC99", n: "blue heart", kw: "love" },
    { c: "\uD83D\uDC9C", n: "purple heart", kw: "love" },
    { c: "\uD83D\uDC94", n: "broken heart", kw: "sad heartbreak" },
    { c: "\uD83D\uDD25", n: "fire", kw: "lit hot flame awesome" },
    { c: "\u2B50", n: "star", kw: "favorite" },
    { c: "\u2728", n: "sparkles", kw: "shiny magic new clean" },
    { c: "\uD83C\uDF89", n: "tada", kw: "party celebrate launch" },
    { c: "\uD83C\uDF8A", n: "confetti", kw: "party celebrate" },
    { c: "\uD83D\uDCA1", n: "bulb", kw: "idea tip light" },
    { c: "\u2705", n: "check", kw: "done yes correct ok tick" },
    { c: "\u274C", n: "cross", kw: "no wrong error x" },
    { c: "\u26A0\uFE0F", n: "warning", kw: "caution alert" },
    { c: "\uD83D\uDEA8", n: "siren", kw: "alert emergency warning" },
    { c: "\uD83D\uDCCC", n: "pin", kw: "note important" },
    { c: "\uD83D\uDCCD", n: "location", kw: "place map pin" },
    { c: "\uD83D\uDCC8", n: "chart up", kw: "growth increase stats" },
    { c: "\uD83D\uDCC9", n: "chart down", kw: "decrease loss stats" },
    { c: "\uD83D\uDCB0", n: "money bag", kw: "cash rich profit" },
    { c: "\uD83D\uDE80", n: "rocket", kw: "launch fast ship startup" },
    { c: "\uD83C\uDFAF", n: "target", kw: "goal aim bullseye" },
    { c: "\uD83D\uDD14", n: "bell", kw: "notification alert" },
    { c: "\uD83D\uDCE7", n: "email", kw: "mail message" },
    { c: "\uD83D\uDCF1", n: "phone", kw: "mobile device" },
    { c: "\uD83D\uDCBB", n: "laptop", kw: "computer code work" },
    { c: "\u2699\uFE0F", n: "gear", kw: "settings config" },
    { c: "\uD83D\uDD12", n: "lock", kw: "secure private" },
    { c: "\uD83D\uDD11", n: "key", kw: "password access" },
    { c: "\uD83D\uDCDD", n: "memo", kw: "note write edit" },
    { c: "\uD83D\uDCDA", n: "books", kw: "read study learn" },
    { c: "\uD83C\uDF1F", n: "glowing star", kw: "special favorite" },
    { c: "\u2615", n: "coffee", kw: "cafe tea break" },
    { c: "\uD83C\uDF55", n: "pizza", kw: "food" },
    { c: "\uD83C\uDF82", n: "cake", kw: "birthday celebrate" },
    { c: "\uD83C\uDF08", n: "rainbow", kw: "colorful pride" },
    { c: "\u2600\uFE0F", n: "sun", kw: "sunny weather" },
    { c: "\uD83C\uDF19", n: "moon", kw: "night" },
    { c: "\u26A1", n: "zap", kw: "lightning fast power" },
    { c: "\uD83C\uDF0A", n: "wave", kw: "ocean sea water" },
    { c: "\uD83D\uDC31", n: "cat", kw: "animal pet" },
    { c: "\uD83D\uDC36", n: "dog", kw: "animal pet puppy" },
    { c: "\uD83E\uDD84", n: "unicorn", kw: "magic special" },
    { c: "\uD83D\uDC40", n: "eyes", kw: "look watch see" },
    { c: "\uD83E\uDDE0", n: "brain", kw: "smart think mind" },
    { c: "\uD83D\uDC96", n: "sparkling heart", kw: "love" },
    { c: "\uD83D\uDE4B", n: "raising hand", kw: "question me pick" },
    { c: "\uD83E\uDD37", n: "shrug", kw: "dunno idk whatever" },
    { c: "\uD83D\uDC80", n: "skull", kw: "dead lol" },
    { c: "\uD83D\uDC7B", n: "ghost", kw: "boo spooky" },
    { c: "\uD83E\uDD16", n: "robot", kw: "ai bot" },
  ];
  let emojiMenu = null;
  let emojiOpen = false;
  let emojiItems: any[] = [];
  let emojiActive = 0;
  let currentColon: any = null;

  function emojiEl() {
    if (emojiMenu) return emojiMenu;
    emojiMenu = document.createElement("div");
    emojiMenu.className = "emoji-menu";
    emojiMenu.dataset.testid = "emoji-menu";
    emojiMenu.style.display = "none";
    document.body.appendChild(emojiMenu);
    return emojiMenu;
  }
  function getColonQuery() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3 || !editor.contains(node)) return null;
    const offset = sel.anchorOffset;
    const before = node.textContent.slice(0, offset);
    const m = before.match(/(?:^|\s)(:([a-z0-9_+-]{1,24}))$/i);
    if (!m) return null;
    return { node, start: offset - m[1].length, end: offset, query: m[2] };
  }
  function renderEmoji() {
    const m = emojiEl();
    m.innerHTML = "";
    emojiItems.forEach((em, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `emoji-item${i === emojiActive ? " active" : ""}`;
      row.dataset.testid = "emoji-item";
      row.title = em.n;
      row.innerHTML = `<span class="emoji-char">${em.c}</span><span class="emoji-name">${escapeHtml(em.n)}</span>`;
      row.addEventListener("mousedown", (e) => { e.preventDefault(); chooseEmoji(i); });
      m.appendChild(row);
    });
  }
  function positionEmoji() {
    const m = emojiEl();
    const sel = window.getSelection();
    let rect = null;
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r && (r.width || r.height || r.top)) rect = r;
    }
    if (!rect) rect = editor.getBoundingClientRect();
    m.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 240))}px`;
    m.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 300))}px`;
  }
  function maybeEmoji() {
    const info = getColonQuery();
    if (!info) { closeEmoji(); return false; }
    currentColon = info;
    const q = info.query.toLowerCase();
    emojiItems = EMOJI.filter((e) => e.n.includes(q) || e.kw.includes(q)).slice(0, 36);
    if (!emojiItems.length) { closeEmoji(); return false; }
    emojiActive = 0;
    renderEmoji();
    positionEmoji();
    emojiEl().style.display = "grid";
    emojiOpen = true;
    return true;
  }
  function closeEmoji() { if (emojiMenu) emojiMenu.style.display = "none"; emojiOpen = false; }
  function chooseEmoji(i) {
    const em = emojiItems[i];
    const info = currentColon;
    closeEmoji();
    if (!em || !info || !editor.contains(info.node)) return;
    const range = document.createRange();
    range.setStart(info.node, info.start);
    range.setEnd(info.node, Math.min(info.end, info.node.textContent.length));
    range.deleteContents();
    const tn = document.createTextNode(em.c);
    range.insertNode(tn);
    const sel = window.getSelection();
    const r2 = document.createRange();
    r2.setStartAfter(tn); r2.collapse(true);
    sel.removeAllRanges(); sel.addRange(r2);
    savedRange = r2;
    updateWordCount();
    scheduleAutosave();
  }

  // ---- Gallery management ----
  function renderGallery() {
    const list = $("gallery-list");
    $("gallery-count").textContent = `(${images.length})`;
    $("gallery-empty").classList.toggle("hidden", images.length > 0);
    list.innerHTML = "";
    images.forEach((img, i) => {
      const cell = document.createElement("div");
      cell.className = "rounded-lg border border-white/10 bg-elevated overflow-hidden";
      cell.dataset.testid = "gallery-item";
      const thumb = document.createElement("div");
      thumb.className = "aspect-square bg-canvas overflow-hidden";
      thumb.innerHTML = `<img src="${img.url}" alt="" class="w-full h-full object-cover" />`;
      const cap = document.createElement("input");
      cap.type = "text";
      cap.value = img.caption;
      cap.placeholder = "Caption (optional)";
      cap.className = "w-full bg-transparent border-t border-white/10 px-2 py-1.5 text-xs text-retro-50 focus:outline-none";
      cap.addEventListener("input", (e) => { images[i].caption = e.target.value; scheduleAutosave(); });
      const bar = document.createElement("div");
      bar.className = "flex items-center justify-between px-2 py-1 border-t border-white/5";
      const pos = document.createElement("div");
      pos.className = "flex gap-1";
      const mk = (label, fn, disabled) => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.textContent = label;
        btn.className = `text-xs px-1.5 py-0.5 rounded ${disabled ? "opacity-30" : "hover:text-teal-300"}`;
        if (!disabled) btn.addEventListener("click", fn);
        return btn;
      };
      pos.appendChild(mk("\u2190", () => { [images[i - 1], images[i]] = [images[i], images[i - 1]]; renderGallery(); scheduleAutosave(); }, i === 0));
      pos.appendChild(mk("\u2192", () => { [images[i + 1], images[i]] = [images[i], images[i + 1]]; renderGallery(); scheduleAutosave(); }, i === images.length - 1));
      const del = document.createElement("button");
      del.type = "button"; del.textContent = "Remove";
      del.className = "text-xs px-1.5 py-0.5 rounded text-red-300/80 hover:text-red-300";
      del.dataset.testid = "gallery-remove";
      del.addEventListener("click", () => { images.splice(i, 1); renderGallery(); scheduleAutosave(); });
      bar.appendChild(pos); bar.appendChild(del);
      cell.appendChild(thumb); cell.appendChild(cap); cell.appendChild(bar);
      list.appendChild(cell);
    });
  }

  $("f-gallery-files").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    $("gallery-upload-label").textContent = "Uploading…";
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/actions/upload", { method: "POST", body: fd });
        const j = await readJson(res);
        if (res.ok) {
          images.push({ url: j.asset.url, caption: "" });
          if (!$("f-cover-url").value.trim()) { $("f-cover-url").value = j.asset.url; setCover(j.asset.url); }
        }
      } catch { /* ignore individual failures */ }
    }
    e.target.value = "";
    $("gallery-upload-label").textContent = "+ Add photos";
    renderGallery();
    showMsg("Photos added \u2713");
    scheduleAutosave();
  });

  applyType();
  renderGallery();

  async function save(status, quiet = false) {
    const data = collect(status);
    if (!data.title) { if (!quiet) { showMsg("A title is required.", false); $("f-title").focus(); } return null; }
    if (!quiet) showMsg("Saving…");
    else showMsg("Saving…");
    const url = state.id ? `/actions/posts/${state.id}` : "/actions/posts";
    const method = state.id ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Save failed.");
      const post = json.post;
      if (!state.id) {
        state.id = post.id;
        window.history.replaceState({}, "", `/admin/posts/${post.id}/edit`);
        $("btn-delete")?.classList.remove("hidden");
      }
      badge.textContent = post.status;
      badge.className = `text-xs font-mono px-2 py-1 rounded-full ${post.status === "published" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`;
      $("btn-unpublish").classList.toggle("hidden", post.status !== "published");
      $("f-slug").value = post.slug;
      showMsg(quiet ? "Autosaved \u2713" : (status === "published" ? "Published \u2713" : "Saved \u2713"));
      return post;
    } catch (err) {
      showMsg(err.message || "Save failed.", false);
      return null;
    }
  }

  // ---- Autosave (quiet, preserves current status) ----
  let autosaveTimer = null;
  let autosaving = false;
  function scheduleAutosave() {
    if (!$("f-title").value.trim()) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(runAutosave, 1500);
  }
  async function runAutosave() {
    if (autosaving) return;
    autosaving = true;
    const status = badge.textContent === "published" ? "published" : "draft";
    await save(status, true);
    autosaving = false;
  }
  ["f-title", "f-slug", "f-excerpt", "f-tags", "f-cover-url"].forEach((id) =>
    $(id).addEventListener("input", scheduleAutosave)
  );

  $("btn-save-draft").addEventListener("click", () => save("draft"));
  $("btn-publish").addEventListener("click", () => save("published"));
  $("btn-unpublish").addEventListener("click", () => save("draft"));

  $("btn-preview").addEventListener("click", async () => {
    const post = await save(badge.textContent === "published" ? "published" : "draft");
    if (post) window.open(`/admin/preview/${post.id}`, "_blank");
  });

  $("btn-delete")?.addEventListener("click", async () => {
    if (!state.id || !confirm("Delete this post permanently?")) return;
    const res = await fetch(`/actions/posts/${state.id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/admin";
    else showMsg("Failed to delete.", false);
  });

  // Cover image handling
  $("f-cover-url").addEventListener("input", (e) => setCover(e.target.value.trim()));
  function setCover(url) {
    $("cover-preview").src = url;
    $("cover-preview-wrap").classList.toggle("hidden", !url);
    $("btn-clear-cover").classList.toggle("hidden", !url);
  }
  $("btn-clear-cover").addEventListener("click", () => { $("f-cover-url").value = ""; setCover(""); scheduleAutosave(); });

  $("f-cover-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    $("upload-label").textContent = "Uploading…";
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/actions/upload", { method: "POST", body: fd });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Upload failed.");
      $("f-cover-url").value = json.asset.url;
      setCover(json.asset.url);
      showMsg("Cover uploaded \u2713");
      scheduleAutosave();
    } catch (err) {
      showMsg(err.message || "Upload failed.", false);
    } finally {
      $("upload-label").textContent = "Upload";
    }
  });

  // ---- In-body image insertion (toolbar button, drag & drop, paste) ----
  async function uploadImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/actions/upload", { method: "POST", body: fd });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error || "Upload failed.");
    return json.asset.url;
  }

  function insertHtmlAtCursor(html) {
    editor.focus();
    if (!selectionInEditor()) restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
      editor.insertAdjacentHTML("beforeend", html);
    } else {
      document.execCommand("insertHTML", false, html);
    }
    saveSelection();
    scheduleAutosave();
  }

  async function embedImage(file, alt) {
    try {
      const url = await uploadImage(file);
      const caption = (alt || file.name.replace(/\.[^.]+$/, "")).trim();
      insertHtmlAtCursor(`<img src="${escapeAttr(url)}" alt="${escapeAttr(caption)}" /><p><br></p>`);
      showMsg("Image inserted \u2713");
    } catch (err) {
      showMsg(err.message || "Upload failed.", false);
    }
  }

  $("f-inline-image").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    saveSelection();
    await embedImage(file);
    e.target.value = "";
  });

  // ---- Rich link preview cards ----
  function buildLinkCard(data) {
    const title = escapeHtml(data.title || data.url);
    const desc = data.description ? `<span class="link-card-desc">${escapeHtml(data.description)}</span>` : "";
    const thumb = data.image ? `<img class="link-card-thumb" src="${escapeAttr(data.image)}" alt="" />` : "";
    return `<a class="link-card" href="${escapeAttr(data.url)}" target="_blank" rel="noopener noreferrer" contenteditable="false"><span class="link-card-body"><span class="link-card-title">${title}</span>${desc}<span class="link-card-domain">${escapeHtml(data.domain || domainOf(data.url))}</span></span>${thumb}</a>`;
  }

  async function insertLinkCard(link) {
    const id = "lc-" + Date.now();
    insertHtmlAtCursor(`<a class="link-card link-card-loading" id="${id}" contenteditable="false" href="${escapeAttr(link)}"><span class="link-card-body"><span class="link-card-title">Loading preview…</span><span class="link-card-domain">${escapeHtml(domainOf(link))}</span></span></a><p><br></p>`);
    let data: any = { url: link, domain: domainOf(link), title: link };
    try {
      const res = await fetch(`/actions/link-preview?url=${encodeURIComponent(link)}`);
      if (res.ok) { const j = await res.json(); if (j && !j.error) data = { url: link, ...j }; }
    } catch { /* fall back to bare card */ }
    const el = document.getElementById(id);
    if (el) el.outerHTML = buildLinkCard(data);
    enhanceEditor();
    saveSelection();
    scheduleAutosave();
  }

  ["dragenter", "dragover"].forEach((ev) =>
    editor.addEventListener(ev, (e) => { e.preventDefault(); editor.classList.add("ring-2", "ring-teal-400/60"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    editor.addEventListener(ev, () => editor.classList.remove("ring-2", "ring-teal-400/60"))
  );
  editor.addEventListener("drop", async (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault();
    saveSelection();
    for (const f of files) await embedImage(f);
  });
  editor.addEventListener("paste", async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type.startsWith("image/"));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) { e.preventDefault(); saveSelection(); await embedImage(file); return; }
    }
    // Pasting a bare URL onto an empty line -> rich preview card.
    const text = (e.clipboardData?.getData("text/plain") || "").trim();
    if (/^https?:\/\/\S+$/i.test(text) && !/\s/.test(text)) {
      const block = getCurrentBlock();
      const empty = !block || block === editor || (block.textContent || "").trim() === "";
      if (empty) {
        e.preventDefault();
        saveSelection();
        await insertLinkCard(text);
      }
    }
  });


  // ---- Word count + reading time ----
  function updateWordCount() {
    const el = $("rte-wordcount");
    if (!el) return;
    const text = plainText();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const mins = Math.max(1, Math.round(words / 200));
    el.textContent = `${words.toLocaleString()} word${words === 1 ? "" : "s"} · ${mins} min read`;
  }

  // ---- Inline link-card editing (editable title/description, swap image, remove) ----
  function enhanceCards() {
    editor.querySelectorAll(".link-card").forEach((card) => {
      if (card.getAttribute("data-enhanced")) return;
      card.setAttribute("data-enhanced", "1");
      card.setAttribute("contenteditable", "false");
      const body = card.querySelector(".link-card-body");
      const titleEl = card.querySelector(".link-card-title");
      let descEl = card.querySelector(".link-card-desc");
      const domainEl = card.querySelector(".link-card-domain");
      if (titleEl) titleEl.setAttribute("contenteditable", "true");
      if (!descEl && body) {
        descEl = document.createElement("span");
        descEl.className = "link-card-desc";
        body.insertBefore(descEl, domainEl || null);
      }
      if (descEl) {
        descEl.setAttribute("contenteditable", "true");
        descEl.setAttribute("data-placeholder-desc", "Add a description…");
      }
      const controls = document.createElement("span");
      controls.className = "link-card-controls";
      controls.setAttribute("data-rte-control", "1");
      controls.setAttribute("contenteditable", "false");
      controls.innerHTML =
        `<button type="button" data-card-act="image" title="Change image" data-testid="card-change-image">` +
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button>` +
        `<button type="button" data-card-act="remove" title="Remove card" data-testid="card-remove">` +
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg></button>`;
      card.appendChild(controls);
    });
  }

  let pendingCard = null;
  function handleCardAction(card, act) {
    if (act === "remove") { card.remove(); enhanceEditor(); scheduleAutosave(); return; }
    if (act === "image") { pendingCard = card; $("f-card-image").click(); }
  }

  $("f-card-image").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingCard) { e.target.value = ""; return; }
    try {
      const url = await uploadImage(file);
      let img = pendingCard.querySelector(".link-card-thumb");
      if (!img) { img = document.createElement("img"); img.className = "link-card-thumb"; img.alt = ""; pendingCard.appendChild(img); }
      img.src = url;
      showMsg("Card image updated \u2713");
      scheduleAutosave();
    } catch (err) {
      showMsg(err.message || "Upload failed.", false);
    } finally {
      e.target.value = ""; pendingCard = null;
    }
  });

  // Prevent card links from navigating while editing; route control-button clicks.
  editor.addEventListener("click", (e) => {
    const card = e.target.closest && e.target.closest(".link-card");
    if (!card) return;
    const actBtn = e.target.closest("[data-card-act]");
    if (actBtn) { e.preventDefault(); e.stopPropagation(); handleCardAction(card, actBtn.dataset.cardAct); return; }
    e.preventDefault();
  });

  function enhanceEditor() { enhanceCards(); updateWordCount(); }

  // ---- Drag to reorder top-level blocks ----
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "rte-drag-handle";
  dragHandle.setAttribute("data-testid", "rte-drag-handle");
  dragHandle.title = "Drag to move";
  dragHandle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>`;
  dragHandle.style.display = "none";
  document.body.appendChild(dragHandle);

  const dropLine = document.createElement("div");
  dropLine.className = "rte-drop-line";
  dropLine.style.display = "none";
  document.body.appendChild(dropLine);

  let hoverBlock = null;
  let dragging = null;
  let dropTargetBlock = null;
  let dropBefore = true;
  let hideTimer = null;

  function topLevelFrom(node) {
    if (!node || !editor.contains(node)) return null;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node.parentNode !== editor) node = node.parentNode;
    return node && node.parentNode === editor ? node : null;
  }
  function positionHandle(block) {
    const r = block.getBoundingClientRect();
    const er = editor.getBoundingClientRect();
    dragHandle.style.top = `${r.top + 3}px`;
    dragHandle.style.left = `${Math.max(4, er.left - 26)}px`;
    dragHandle.style.display = "flex";
  }
  editor.addEventListener("mousemove", (e) => {
    if (dragging) return;
    const block = topLevelFrom(e.target);
    if (block) { hoverBlock = block; positionHandle(block); }
  });
  function scheduleHide() { hideTimer = setTimeout(() => { if (!dragging) dragHandle.style.display = "none"; }, 350); }
  editor.addEventListener("mouseleave", scheduleHide);
  dragHandle.addEventListener("mouseenter", () => { if (hideTimer) clearTimeout(hideTimer); });
  dragHandle.addEventListener("mouseleave", scheduleHide);

  dragHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (!hoverBlock) return;
    dragging = hoverBlock;
    dragging.classList.add("rte-dragging");
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragUp);
  });
  function onDragMove(e) {
    const blocks = Array.from(editor.children).filter((b) => b !== dragging);
    let target = null, before = true;
    for (const b of blocks) {
      const r = b.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { target = b; before = true; break; }
      target = b; before = false;
    }
    dropTargetBlock = target; dropBefore = before;
    if (target) {
      const r = target.getBoundingClientRect();
      const er = editor.getBoundingClientRect();
      dropLine.style.left = `${er.left + 10}px`;
      dropLine.style.width = `${er.width - 20}px`;
      dropLine.style.top = `${(before ? r.top : r.bottom) - 1}px`;
      dropLine.style.display = "block";
    } else {
      dropLine.style.display = "none";
    }
  }
  function onDragUp() {
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragUp);
    dropLine.style.display = "none";
    dragHandle.style.display = "none";
    if (dragging && dropTargetBlock && dropTargetBlock !== dragging) {
      if (dropBefore) editor.insertBefore(dragging, dropTargetBlock);
      else editor.insertBefore(dragging, dropTargetBlock.nextSibling);
      scheduleAutosave();
    }
    if (dragging) dragging.classList.remove("rte-dragging");
    dragging = null; dropTargetBlock = null;
  }
  window.addEventListener("scroll", () => { if (!dragging) dragHandle.style.display = "none"; }, true);

  // Initial enhancement pass (cards + word count) for freshly loaded content.
  enhanceEditor();

  // ---- Unsplash search modal ----
  const unsplashModal = $("unsplash-modal");
  const unsplashInput = $("unsplash-input");
  const unsplashResults = $("unsplash-results");
  const unsplashStatus = $("unsplash-status");
  let unsplashTimer = null;

  function openUnsplash() {
    saveSelection();
    unsplashModal.classList.remove("hidden");
    setTimeout(() => unsplashInput.focus(), 30);
  }
  function closeUnsplash() { unsplashModal.classList.add("hidden"); }

  $("btn-unsplash").addEventListener("click", (e) => { e.preventDefault(); openUnsplash(); });
  unsplashModal.querySelectorAll("[data-unsplash-close]").forEach((el) => el.addEventListener("click", closeUnsplash));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !unsplashModal.classList.contains("hidden")) closeUnsplash(); });
  unsplashInput.addEventListener("input", () => { clearTimeout(unsplashTimer); unsplashTimer = setTimeout(runUnsplash, 450); });
  unsplashInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(unsplashTimer); runUnsplash(); } });

  async function runUnsplash() {
    const q = unsplashInput.value.trim();
    if (!q) { unsplashResults.innerHTML = ""; unsplashStatus.textContent = "Search for a photo to insert."; unsplashStatus.style.display = "block"; return; }
    unsplashStatus.textContent = "Searching\u2026"; unsplashStatus.style.display = "block"; unsplashResults.innerHTML = "";
    try {
      const res = await fetch(`/actions/unsplash/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) { unsplashStatus.textContent = data.error || "Search failed."; return; }
      if (!data.results.length) { unsplashStatus.textContent = "No photos found. Try another term."; return; }
      unsplashStatus.style.display = "none";
      renderUnsplash(data.results);
    } catch {
      unsplashStatus.textContent = "Unable to reach Unsplash.";
    }
  }
  function renderUnsplash(results) {
    unsplashResults.innerHTML = "";
    results.forEach((p) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "unsplash-cell";
      cell.dataset.testid = "unsplash-photo";
      cell.style.background = p.color;
      cell.innerHTML = `<img src="${escapeAttr(p.thumb)}" alt="${escapeAttr(p.alt)}" loading="lazy" /><span class="unsplash-cred">${escapeHtml(p.name)}</span>`;
      cell.addEventListener("click", () => insertUnsplash(p));
      unsplashResults.appendChild(cell);
    });
  }
  function insertUnsplash(p) {
    const userUrl = `https://unsplash.com/@${p.username}?utm_source=anpabelt&utm_medium=referral`;
    const unsplashUrl = `https://unsplash.com/?utm_source=anpabelt&utm_medium=referral`;
    const html = `<figure><img src="${escapeAttr(p.regular)}" alt="${escapeAttr(p.alt)}" /><figcaption>Photo by <a href="${escapeAttr(userUrl)}">${escapeHtml(p.name)}</a> on <a href="${escapeAttr(unsplashUrl)}">Unsplash</a></figcaption></figure><p><br></p>`;
    closeUnsplash();
    insertHtmlAtCursor(html);
    if (p.downloadLocation) {
      fetch("/actions/unsplash/track-download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ downloadLocation: p.downloadLocation }) }).catch(() => {});
    }
    enhanceEditor();
    showMsg("Photo inserted \u2713");
  }


  // ---- Table row/column controls (floating, on cell hover) ----
  const tableTools = document.createElement("div");
  tableTools.className = "rte-table-tools";
  tableTools.dataset.testid = "table-tools";
  tableTools.style.display = "none";
  const svgAddRow = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="6" rx="1"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8.5" y1="17.5" x2="15.5" y2="17.5"/></svg>`;
  const svgDelRow = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="6" rx="1"/><line x1="8.5" y1="17.5" x2="15.5" y2="17.5"/></svg>`;
  const svgAddCol = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="3" width="6" height="18" rx="1"/><line x1="18" y1="8.5" x2="18" y2="15.5"/><line x1="14.5" y1="12" x2="21.5" y2="12"/></svg>`;
  const svgDelCol = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="3" width="6" height="18" rx="1"/><line x1="14.5" y1="12" x2="21.5" y2="12"/></svg>`;
  tableTools.innerHTML =
    `<button type="button" data-tt="add-row" title="Add row below" data-testid="tt-add-row">${svgAddRow}</button>` +
    `<button type="button" class="tt-del" data-tt="del-row" title="Delete row" data-testid="tt-del-row">${svgDelRow}</button>` +
    `<span class="tt-sep"></span>` +
    `<button type="button" data-tt="add-col" title="Add column right" data-testid="tt-add-col">${svgAddCol}</button>` +
    `<button type="button" class="tt-del" data-tt="del-col" title="Delete column" data-testid="tt-del-col">${svgDelCol}</button>`;
  document.body.appendChild(tableTools);

  let ttCell = null;
  let ttHideTimer = null;

  function cellFromNode(node) {
    while (node && node !== editor) { if (node.tagName === "TD" || node.tagName === "TH") return node; node = node.parentNode; }
    return null;
  }
  function positionTableTools(cell) {
    const r = cell.getBoundingClientRect();
    tableTools.style.top = `${Math.max(6, r.top - 30)}px`;
    tableTools.style.left = `${Math.min(window.innerWidth - 150, r.right - 132)}px`;
    tableTools.style.display = "flex";
  }
  editor.addEventListener("mousemove", (e) => {
    if (dragging) return;
    const cell = cellFromNode(e.target);
    if (cell) { ttCell = cell; if (ttHideTimer) clearTimeout(ttHideTimer); positionTableTools(cell); }
  });
  function scheduleTtHide() { ttHideTimer = setTimeout(() => { tableTools.style.display = "none"; }, 400); }
  editor.addEventListener("mouseleave", scheduleTtHide);
  tableTools.addEventListener("mouseenter", () => { if (ttHideTimer) clearTimeout(ttHideTimer); });
  tableTools.addEventListener("mouseleave", scheduleTtHide);
  window.addEventListener("scroll", () => { tableTools.style.display = "none"; }, true);

  function colIndexOf(cell) { return Array.from(cell.parentElement.children).indexOf(cell); }
  function tableEmptyGuard(table) {
    if (!table.querySelector("th, td")) {
      const p = makeEl("<p><br></p>");
      table.replaceWith(p);
      placeCaret(p);
      return true;
    }
    return false;
  }
  tableTools.querySelectorAll("[data-tt]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!ttCell || !editor.contains(ttCell)) return;
      const table = ttCell.closest("table");
      const act = btn.dataset.tt;
      if (act === "add-row") {
        const row = ttCell.closest("tr");
        const cols = row.children.length;
        const tr = document.createElement("tr");
        for (let i = 0; i < cols; i++) { const td = document.createElement("td"); td.innerHTML = "<br>"; tr.appendChild(td); }
        if (row.parentElement.tagName === "THEAD") {
          const tbody = table.querySelector("tbody") || table;
          tbody.insertBefore(tr, tbody.firstChild);
        } else { row.after(tr); }
      } else if (act === "del-row") {
        const row = ttCell.closest("tr");
        const section = row.parentElement;
        row.remove();
        if (section && section.tagName === "THEAD" && !section.children.length) section.remove();
        tableTools.style.display = "none";
        if (!tableEmptyGuard(table)) ttCell = null;
      } else if (act === "add-col") {
        const idx = colIndexOf(ttCell);
        Array.from(table.rows).forEach((r) => {
          const isHead = r.parentElement.tagName === "THEAD";
          const cell = document.createElement(isHead ? "th" : "td");
          cell.innerHTML = "<br>";
          const ref = r.children[idx];
          if (ref) ref.after(cell); else r.appendChild(cell);
        });
      } else if (act === "del-col") {
        const idx = colIndexOf(ttCell);
        Array.from(table.rows).forEach((r) => { const c = r.children[idx]; if (c) c.remove(); });
        tableTools.style.display = "none";
        if (!tableEmptyGuard(table)) ttCell = null;
      }
      updateWordCount();
      scheduleAutosave();
    });
  });
