const Gallery = (() => {
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const modalDownload = document.getElementById("modal-download");

  function renderItem(item) {
    const card = document.createElement("article");
    card.className = "card";
    const isVideo = item.mimeType.startsWith("video/");

    if (isVideo) {
      const video = document.createElement("video");
      video.src = item.url_view;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.poster = item.thumb;
      card.appendChild(video);
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "Video";
      card.appendChild(badge);
    } else {
      const img = document.createElement("img");
      img.src = item.thumb;
      img.loading = "lazy";
      img.alt = item.name;
      card.appendChild(img);
    }

    card.addEventListener("click", () => open(item));
    return card;
  }

  function open(item) {
    modalContent.innerHTML = "";
    const isVideo = item.mimeType.startsWith("video/");
    if (isVideo) {
      const video = document.createElement("video");
      video.src = item.url_view;
      video.controls = true;
      video.autoplay = true;
      video.style.maxHeight = "80vh";
      modalContent.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.url_view;
      img.alt = item.name;
      modalContent.appendChild(img);
    }
    modalDownload.href = item.url_dl;
    modal.classList.remove("hidden");
  }

  function close() {
    modal.classList.add("hidden");
    modalContent.innerHTML = "";
  }

  async function load() {
    try {
      const res = await fetch("public/media.json", { cache: "no-store" });
      const media = await res.json();
      if (!Array.isArray(media) || media.length === 0) {
        statusEl.textContent = "No media found. Ensure the Drive folder is public.";
        return;
      }
      media.forEach((item) => grid.appendChild(renderItem(item)));
      statusEl.textContent = "";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Failed to load media.json";
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  load();
  return { close };
})();
