// Placeholder gallery items (swap later with Amelia's real work)
const items = Array.from({ length: 12 }).map((_, i) => {
  const n = i + 1;
  return {
    id: n,
    title: `Artwork ${n}`,
    // Picsum placeholders (fine for now)
    thumb: `https://picsum.photos/seed/amelia-${n}/600/450`,
    full: `https://picsum.photos/seed/amelia-${n}/1400/1000`,
  };
});

const grid = document.getElementById("galleryGrid");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");

items.forEach((it) => {
  const btn = document.createElement("button");
  btn.className = "card";
  btn.type = "button";
  btn.innerHTML = `<img src="${it.thumb}" alt="${it.title}" loading="lazy" />`;
  btn.addEventListener("click", () => openLightbox(it));
  grid.appendChild(btn);
});

function openLightbox(it){
  lightboxImg.src = it.full;
  lightboxCaption.textContent = it.title;
  lightbox.classList.add("show");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox(){
  lightbox.classList.remove("show");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

// ESC closes
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("show")) closeLightbox();
});
