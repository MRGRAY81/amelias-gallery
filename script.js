:root{
  --bg:#fbf7f2;
  --bg2:#f6efe7;
  --card:rgba(255,255,255,.70);
  --stroke:rgba(55,40,20,.10);
  --ink:#2a2530;
  --muted:rgba(42,37,48,.62);
  --peach:rgba(243,162,126,.85);
  --shadow:0 18px 45px rgba(20,12,5,.10);
  --r:24px;
}

*{box-sizing:border-box}
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  color:var(--ink);
  background:
    radial-gradient(900px 520px at 70% -120px, rgba(243,162,126,.22), transparent 55%),
    radial-gradient(900px 520px at 10% 110%, rgba(122,167,215,.18), transparent 55%),
    linear-gradient(var(--bg), var(--bg2));
}

/* ===== Layout Shell ===== */
.shell{
  max-width:1200px;
  margin:0 auto;
  padding:0 16px 26px;
}

/* ===== Header / Nav (fixed centering) ===== */
.topbar{
  width:100%;
  padding-top:18px;
}
.topbar-inner{
  max-width:1200px;
  margin:0 auto;
  padding:10px 16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}

/* remove the A logo entirely */
.brand-left{ display:none; }

/* Button-style navigation */
.nav{
  width:auto;
  display:flex;
  gap:10px;
  justify-content:flex-end;
  flex-wrap:wrap;
  font-weight:900;
}
.nav a{
  text-decoration:none;
  padding:10px 14px;
  border-radius:999px;
  background:rgba(255,255,255,.70);
  border:1px solid var(--stroke);
  color:rgba(42,37,48,.72);
}
.nav a:hover{
  background:rgba(255,255,255,.82);
  color:rgba(42,37,48,.92);
}
.nav a.active{
  background:rgba(255,255,255,.88);
  box-shadow:0 12px 28px rgba(20,12,5,.08);
}
.nav a.admin{
  background:linear-gradient(180deg, rgba(243,162,126,.92), rgba(243,162,126,.76));
  color:#fff;
}

/* ===== Hero ===== */
.hero{ margin-top:10px; }

.hero-banner{
  border-radius:var(--r);
  border:1px solid var(--stroke);
  background:var(--card);
  box-shadow:var(--shadow);
  overflow:hidden;
}

/* Header image variant */
.hero-banner.image-header{
  position:relative;
  background:none;
  padding:12px;
}

/* Crop header image to keep it clean */
.header-crop{
  border-radius:18px;
  overflow:hidden;
}
.header-crop img{
  width:112%;
  margin-left:-6%;
  display:block;
  transform:translateY(-6px);
}

/* Mask baked-in text on header image (top-right) */
.hero-banner.image-header::after{
  content:"";
  position:absolute;
  top:18px;
  right:18px;
  width:220px;
  height:64px;
  background: rgba(255,255,255,.88);
  backdrop-filter: blur(6px);
  border-radius:18px;
  pointer-events:none;
}

/* ===== Sections ===== */
.section{ margin-top:18px; }

.section-head{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:14px;
  padding:14px 14px 0;
}
.section-head h2{ margin:0; font-size:18px; font-weight:950; }
.section-head p{ margin:0; color:var(--muted); font-weight:750; }

/* ===== Grid / Cards ===== */
.grid{
  margin-top:14px;
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:12px;
}
.card{
  border-radius:18px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.62);
  box-shadow:0 14px 30px rgba(20,12,5,.06);
  overflow:hidden;
  cursor:pointer;
  padding:0;
}
.card img{
  width:100%;
  height:185px;
  object-fit:cover;
  display:block;
}

/* ===== Buttons ===== */
.btn{
  border:1px solid var(--stroke);
  background:linear-gradient(180deg, rgba(243,162,126,.92), rgba(243,162,126,.76));
  color:#fff;
  padding:12px 16px;
  border-radius:999px;
  font-weight:950;
  cursor:pointer;
  text-decoration:none;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
}
.btn:hover{ filter:brightness(.98); }

.btn.ghost{
  background:rgba(255,255,255,.70);
  color:rgba(42,37,48,.80);
}

/* ===== Home actions ===== */
.home-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  padding:0 14px;
  margin-top:12px;
}

/* ===== CTA ===== */
.cta{
  margin-top:16px;
  padding:16px;
  border-radius:var(--r);
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.62);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.cta h3{ margin:0; font-size:18px; font-weight:950; }
.cta p{ margin:6px 0 0; color:var(--muted); font-weight:750; }

/* ===== Forms ===== */
.formcard{
  margin-top:14px;
  padding:16px;
  border-radius:var(--r);
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.62);
  box-shadow:var(--shadow);
}
.field{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-top:12px;
}
label{ font-weight:900; }
input, textarea{
  width:100%;
  border-radius:16px;
  border:1px solid var(--stroke);
  padding:12px 12px;
  font:inherit;
  background:rgba(255,255,255,.85);
}
textarea{ min-height:120px; resize:vertical; }

/* ===== Footer ===== */
.footer{
  margin-top:16px;
  text-align:center;
  color:var(--muted);
  font-weight:800;
  padding:10px 0;
}

/* ===== Lightbox ===== */
.lightbox{
  position:fixed;
  inset:0;
  display:none;
  place-items:center;
  padding:18px;
  background:rgba(20,12,5,.55);
  z-index:9999;
}
.lightbox.show{ display:grid; }
.lightbox-inner{
  position:relative;
  width:min(920px, 96vw);
  background:rgba(255,255,255,.92);
  border-radius:24px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.22);
  box-shadow:0 28px 70px rgba(0,0,0,.35);
}
.lightbox-inner img{ width:100%; height:auto; display:block; }
.lightbox-close{
  position:absolute;
  right:10px; top:10px;
  width:42px; height:42px;
  border-radius:14px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.85);
  cursor:pointer;
  font-size:18px;
  font-weight:900;
}
.lightbox-caption{
  padding:10px 14px 14px;
  color:rgba(42,37,48,.70);
  font-weight:800;
}

/* ===== Responsive ===== */
@media (max-width: 980px){
  .grid{ grid-template-columns:repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px){
  .topbar-inner{ flex-wrap:wrap; }
  .nav{ width:auto; justify-content:flex-start; }
  .grid{ grid-template-columns:repeat(2, minmax(0, 1fr)); }
  .cta{ flex-direction:column; align-items:flex-start; }
  .header-crop img{
    width:120%;
    margin-left:-10%;
    transform:translateY(-4px);
  }
  .hero-banner.image-header::after{
    top:14px;
    right:14px;
    width:200px;
    height:58px;
  }
    }
