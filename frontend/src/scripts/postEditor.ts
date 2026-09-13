// Client logic for the admin Post editor (Article + Gallery).
// Medium-style rich text editing on a contenteditable surface; content is saved as HTML.
const dataEl = document.getElementById("editor-data");
const initial: any = dataEl && dataEl.textContent ? JSON.parse(dataEl.textContent) : {};

  const state = { id: initial.id };
  const $ = (id) => document.getElementById(id);
  const msg = $("editor-status-msg");
  const badge = $("status-badge");
  const editor = $("f-content");

  function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
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

  // Read editor HTML; treat visually-empty content as an empty string.
  function getContentHtml() {
    const html = editor.innerHTML.trim();
    const text = (editor.textContent || "").trim();
    if (!text && !editor.querySelector("img")) return "";
    return html;
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
    b.addEventListener("click", () => { currentType = b.dataset.type; applyType(); });
  });

  // ---- Rich text toolbar ----
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

  function exec(command, value = null) {
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
  }

  // Wrap the current selection in an element (for inline code + font size).
  function wrapSelection(tagName, style) {
    editor.focus();
    restoreSelection();
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
    } catch { /* selection spanned block boundaries; ignore */ }
  }

  // Toolbar buttons: keep focus/selection in the editor on mousedown.
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

  // Keyboard shortcuts are handled natively by contenteditable (Ctrl/Cmd + B/I/U).

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
      cap.addEventListener("input", (e) => { images[i].caption = e.target.value; });
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
      pos.appendChild(mk("\u2190", () => { [images[i - 1], images[i]] = [images[i], images[i - 1]]; renderGallery(); }, i === 0));
      pos.appendChild(mk("\u2192", () => { [images[i + 1], images[i]] = [images[i], images[i + 1]]; renderGallery(); }, i === images.length - 1));
      const del = document.createElement("button");
      del.type = "button"; del.textContent = "Remove";
      del.className = "text-xs px-1.5 py-0.5 rounded text-red-300/80 hover:text-red-300";
      del.dataset.testid = "gallery-remove";
      del.addEventListener("click", () => { images.splice(i, 1); renderGallery(); });
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
  });

  applyType();
  renderGallery();

  async function save(status) {
    const data = collect(status);
    if (!data.title) { showMsg("A title is required.", false); return null; }
    showMsg("Saving…");
    const url = state.id ? `/actions/posts/${state.id}` : "/actions/posts";
    const method = state.id ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed.");
      const post = json.post;
      // First save of a new post: switch to its edit URL without a full reload feel.
      if (!state.id) {
        state.id = post.id;
        window.history.replaceState({}, "", `/admin/posts/${post.id}/edit`);
        $("btn-delete")?.classList.remove("hidden");
      }
      badge.textContent = post.status;
      badge.className = `text-xs font-mono px-2 py-1 rounded-full ${post.status === "published" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`;
      $("btn-unpublish").classList.toggle("hidden", post.status !== "published");
      $("f-slug").value = post.slug;
      showMsg(status === "published" ? "Published \u2713" : "Saved \u2713");
      return post;
    } catch (err) {
      showMsg(err.message || "Save failed.", false);
      return null;
    }
  }

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
  $("btn-clear-cover").addEventListener("click", () => { $("f-cover-url").value = ""; setCover(""); });

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

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function insertHtmlAtCursor(html) {
    editor.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
      // No caret inside the editor — append at the end.
      editor.insertAdjacentHTML("beforeend", html);
    } else {
      document.execCommand("insertHTML", false, html);
    }
    saveSelection();
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
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    saveSelection();
    await embedImage(file);
  });
