// Lightbox for gallery/photo posts. Externalised so it lints/bundles cleanly.
const dataEl = document.getElementById("gallery-data");
const images: any[] = dataEl && dataEl.textContent ? JSON.parse(dataEl.textContent) : [];

  const box = document.getElementById("lightbox");
  if (box && images.length) {
    const imgEl = document.getElementById("lightbox-img");
    const capEl = document.getElementById("lightbox-cap");
    let idx = 0;
    const show = (i) => {
      idx = (i + images.length) % images.length;
      imgEl.src = images[idx].url;
      capEl.textContent = images[idx].caption || "";
    };
    const open = (i) => { show(i); box.classList.remove("hidden"); box.classList.add("flex"); };
    const close = () => { box.classList.add("hidden"); box.classList.remove("flex"); };
    document.querySelectorAll(".gallery-open").forEach((btn) => {
      btn.addEventListener("click", () => open(Number(btn.dataset.index)));
    });
    document.getElementById("lightbox-close").addEventListener("click", close);
    document.getElementById("lightbox-prev").addEventListener("click", () => show(idx - 1));
    document.getElementById("lightbox-next").addEventListener("click", () => show(idx + 1));
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (box.classList.contains("hidden")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

