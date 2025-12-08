const Gallery = (() => {
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const foldersEl = document.getElementById("folders");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const modalDownload = document.getElementById("modal-download");
  let media = [];
  let folders = [];
  let currentFolderId = null;

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
      const frame = document.createElement("iframe");
      frame.src = item.url_view;
      frame.width = "100%";
      frame.height = "100%";
      frame.style.border = "none";
      frame.allow = "autoplay";
      frame.allowFullscreen = true;
      modalContent.appendChild(frame);
    } else {
      const img = document.createElement("img");
      img.src = item.thumb;
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

  function renderFolders() {
    foldersEl.innerHTML = "";
    folders.forEach((folder) => {
      const btn = document.createElement("button");
      btn.className = "folder-chip" + (folder.id === currentFolderId ? " active" : "");
      btn.textContent = folder.name || folder.id;
      btn.addEventListener("click", () => {
        currentFolderId = folder.id;
        renderFolders();
        renderGrid();
      });
      foldersEl.appendChild(btn);
    });
  }

  function renderGrid() {
    grid.innerHTML = "";
    const filtered = currentFolderId ? media.filter((m) => m.folderId === currentFolderId) : media;
    filtered.forEach((item) => grid.appendChild(renderItem(item)));
    statusEl.textContent = filtered.length === 0 ? "No media in this folder." : "";
  }

  async function load() {
    try {
      const [foldersRes, mediaRes] = await Promise.all([
        fetch("public/folders.json", { cache: "no-store" }),
        fetch("public/media.json", { cache: "no-store" }),
      ]);
      folders = await foldersRes.json();
      media = await mediaRes.json();
      if (!Array.isArray(media) || media.length === 0) {
        statusEl.textContent = "No media found. Ensure the Drive folder is public.";
        return;
      }
      currentFolderId = folders?.[0]?.id || null;
      renderFolders();
      renderGrid();
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
