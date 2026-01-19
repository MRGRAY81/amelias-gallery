// Amelia’s Gallery — Infinite looping carousel rows

const rows = [
  {
    title: "Landscapes",
    reverse: false,
    items: [
      { src: "https://picsum.photos/id/1018/800/600", title: "Golden Field" },
      { src: "https://picsum.photos/id/1025/800/600", title: "River Valley" },
      { src: "https://picsum.photos/id/1039/800/600", title: "Blue Hills" },
      { src: "https://picsum.photos/id/1056/800/600", title: "Coastal Light" },
      { src: "https://picsum.photos/id/1069/800/600", title: "Autumn Path" }
    ]
  },
  {
    title: "Characters",
    reverse: true,
    items: [
      { src: "https://picsum.photos/id/64/800/600", title: "Happy Hero" },
      { src: "https://picsum.photos/id/433/800/600", title: "Mystery Friend" },
      { src: "https://picsum.photos/id/823/800/600", title: "Cartoon Style" },
      { src: "https://picsum.photos/id/839/800/600", title: "Portrait Study" }
    ]
  },
  {
    title: "Cute Animals",
    reverse: false,
    items: [
      { src: "https://picsum.photos/id/237/800/600", title: "Doggo" },
      { src: "https://picsum.photos/id/219/800/600", title: "Fluffy Friend" },
      { src: "https://picsum.photos/id/582/800/600", title: "Forest Pal" },
      { src: "https://picsum.photos/id/593/800/600", title: "Little Explorer" }
    ]
  }
];

const galleryRows = document.getElementById("galleryRows");

/* Lightbox */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");

function openLightbox(src, caption){
  lightboxImg.src = src;
  lightboxCaption.textContent = caption || "";
  lightbox.classList.add("show");
}

function closeLightbox(){
  lightbox.classList.remove("show");
  lightboxImg.src = "";
}

if (lightboxClose) lightboxClose.onclick = closeLightbox;
lightbox.onclick = (e) => { if (e.target === lightbox) closeLightbox(); };
document.onkeydown = (e) => { if (e.key === "Escape") closeLightbox(); };

/* Build rows */
function buildRow(row, index){
  const block = document.createElement("div");
  block.className = "row-block";

  const head = document.createElement("div");
  head.className = "row-head";
  head.innerHTML = `<h4>${row.title}</h4><div class="hint">Swipe • loops forever</div>`;

  const carousel = document.createElement("div");
  carousel.className = "carousel";

  const track = document.createElement("div");
  track.className = "track" + (row.reverse ? " reverse" : "");

  const items = [...row.items, ...row.items];
  items.forEach(item => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.innerHTML = `
      <img src="${item.src}" alt="${item.title}">
      <div class="cap">${item.title}</div>
    `;
    tile.onclick = () => openLightbox(item.src, item.title);
    track.appendChild(tile);
  });

  track.style.animationDuration = `${40 + index * 8}s`;

  carousel.appendChild(track);
  block.appendChild(head);
  block.appendChild(carousel);

  return block;
}

if (galleryRows){
  rows.forEach((row, i) => galleryRows.appendChild(buildRow(row, i)));
}
