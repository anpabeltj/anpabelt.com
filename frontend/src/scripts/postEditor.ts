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
      scheduleAutosave();
    } catch { /* selection spanned block boundaries; ignore */ }
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
        wrapSelection("code");
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
    blockSelect.value = "p";
  });

  const sizeSelect = $("rte-size");
  sizeSelect.addEventListener("mousedown", saveSelection);
  sizeSelect.addEventListener("change", () => {
    if (sizeSelect.value) wrapSelection("span", { fontSize: sizeSelect.value });
    sizeSelect.value = "";
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
  const SLASH_COMMANDS = [
    { key: "H1", title: "Heading 1", desc: "Large section title", kw: "h1 title heading big", run: (b) => slashBlock(b, "<h1><br></h1>") },
    { key: "H2", title: "Heading 2", desc: "Medium section title", kw: "h2 subtitle heading", run: (b) => slashBlock(b, "<h2><br></h2>") },
    { key: "H3", title: "Heading 3", desc: "Small section title", kw: "h3 heading", run: (b) => slashBlock(b, "<h3><br></h3>") },
    { key: "P", title: "Text", desc: "Plain paragraph", kw: "p text paragraph body", run: (b) => slashBlock(b, "<p><br></p>") },
    { key: "\u201C", title: "Quote", desc: "Blockquote", kw: "quote blockquote", run: (b) => slashBlock(b, "<blockquote><br></blockquote>") },
    { key: "</>", title: "Code block", desc: "Monospace block", kw: "code pre snippet", run: (b) => slashBlock(b, "<pre><br></pre>") },
    { key: "\u2022", title: "Bullet list", desc: "Unordered list", kw: "ul bullet list unordered", run: (b) => slashBlock(b, "<ul><li></li></ul>", "li") },
    { key: "1.", title: "Numbered list", desc: "Ordered list", kw: "ol number ordered list", run: (b) => slashBlock(b, "<ol><li></li></ol>", "li") },
    { key: "\u2014", title: "Divider", desc: "Horizontal rule", kw: "hr divider rule line separator", run: (b) => { const hr = makeEl("<hr>"); const p = makeEl("<p><br></p>"); b.replaceWith(hr); hr.after(p); placeCaret(p); scheduleAutosave(); } },
    { key: "\uD83D\uDDBC", title: "Image", desc: "Upload from your device", kw: "image img photo picture upload", run: (b) => { placeCaret(b); $("f-inline-image").click(); } },
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

  editor.addEventListener("input", () => { maybeSlash(); updatePlaceholder(); enhanceEditor(); scheduleAutosave(); });
  editor.addEventListener("keydown", (e) => {
    if (!slashOpen) return;
    if (e.key === "ArrowDown") { e.preventDefault(); if (slashItems.length) { slashActive = (slashActive + 1) % slashItems.length; renderMenu(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (slashItems.length) { slashActive = (slashActive - 1 + slashItems.length) % slashItems.length; renderMenu(); } }
    else if (e.key === "Enter") { if (slashItems.length) { e.preventDefault(); chooseSlash(slashActive); } else closeSlash(); }
    else if (e.key === "Escape") { e.preventDefault(); closeSlash(); }
  });
  document.addEventListener("scroll", () => { if (slashOpen) closeSlash(); }, true);
  editor.addEventListener("blur", () => setTimeout(closeSlash, 150));

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
        const j = await res.json();
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
    if (!data.title) { if (!quiet) showMsg("A title is required.", false); return null; }
    if (!quiet) showMsg("Saving…");
    else showMsg("Saving…");
    const url = state.id ? `/actions/posts/${state.id}` : "/actions/posts";
    const method = state.id ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
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
      const json = await res.json();
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
    const json = await res.json();
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
