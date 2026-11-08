import { YONLER, oku, yaz, enKisaYol, kapanlar, ulasilabilir, boya, ORNEKLER } from './core.mjs';

const $ = id => document.getElementById(id);
const ANAHTAR = 'otopark-kacisi-v1';
let plan = oku(ORNEKLER.donus.plan);
let firca = '>';
let suruluyor = null;     // { yol, i }

try { const m = localStorage.getItem(ANAHTAR); if (m && !new URLSearchParams(location.search).has('ornek')) { const p = oku(m); if (p.boy && p.en) plan = p; } } catch { /* yok */ }
const istenen = new URLSearchParams(location.search).get('ornek');
if (ORNEKLER[istenen]) plan = oku(ORNEKLER[istenen].plan);
const kaydet = () => { try { localStorage.setItem(ANAHTAR, yaz(plan)); } catch { /* özel pencere */ } };

// ---------- Fırça ve örnekler ----------
document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { firca = b.dataset.c; fircaGoster(); });
function fircaGoster() { document.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('secili', b.dataset.c === firca)); }
$('ornekler').innerHTML = Object.entries(ORNEKLER).map(([k, o]) => `<button type="button" data-ornek="${k}">${o.ad}</button>`).join('');
document.querySelectorAll('[data-ornek]').forEach(b => b.onclick = () => { plan = oku(ORNEKLER[b.dataset.ornek].plan); suruluyor = null; kaydet(); hepsi(); });

// ---------- Boyut ----------
function boyutYaz() { $('en').value = plan.en; $('boy').value = plan.boy; }
function boyutDegis() {
  const en = Math.round(+$('en').value), boy = Math.round(+$('boy').value);
  const iyiEn = en >= 4 && en <= 30, iyiBoy = boy >= 3 && boy <= 20;
  $('en').classList.toggle('hatali', !iyiEn); $('boy').classList.toggle('hatali', !iyiBoy);
  if (!iyiEn || !iyiBoy) return;
  const satirlar = Array.from({ length: boy }, (_, y) => Array.from({ length: en }, (_, x) => {
    const c = plan.izgara[y]?.[x];
    if (y === 0 || x === 0 || y === boy - 1 || x === en - 1) return c && c !== '.' ? c : '#';
    return c ?? '.';
  }).join(''));
  plan = oku(satirlar.join('\n')); suruluyor = null; kaydet(); hepsi(false);
}
$('en').onchange = boyutDegis; $('boy').onchange = boyutDegis;

// ---------- Çizim ----------
const tuval = $('plan');
let H = 40;
function ciz() {
  H = Math.max(20, Math.min(56, Math.floor(1000 / plan.en)));
  tuval.width = plan.en * H; tuval.height = plan.boy * H;
  const g = tuval.getContext('2d');
  const sonuc = enKisaYol(plan), serbest = enKisaYol(plan, false);
  const kapan = new Set(kapanlar(plan).map(h => `${h.x},${h.y}`));
  g.textAlign = 'center'; g.textBaseline = 'middle';
  plan.izgara.forEach((r, y) => r.forEach((c, x) => {
    const px = x * H, py = y * H;
    g.fillStyle = c === '#' ? '#6b4a3e' : kapan.has(`${x},${y}`) ? '#4a1714' : '#3b3a3f';
    g.fillRect(px, py, H, H);
    if (c === '#') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px + 2, py + H / 2 - 1, H - 4, 2); g.fillRect(px + H / 2 - 1, py + 2, 2, H / 2 - 3); }
    if (c !== '#') { g.strokeStyle = 'rgba(255,241,210,0.12)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, H - 1, H - 1); }
    if (YONLER[c]) {
      const [dx, dy] = YONLER[c], cx = px + H / 2, cy = py + H / 2, s = H * 0.26;
      g.fillStyle = 'rgba(255,207,58,0.85)';
      g.beginPath();
      g.moveTo(cx + dx * s, cy + dy * s);
      g.lineTo(cx - dx * s * 0.6 - dy * s * 0.75, cy - dy * s * 0.6 + dx * s * 0.75);
      g.lineTo(cx - dx * s * 0.6 + dy * s * 0.75, cy - dy * s * 0.6 - dx * s * 0.75);
      g.closePath(); g.fill();
    }
    if (c === 'P') { g.font = `${H * 0.62}px sans-serif`; g.fillText('🚗', px + H / 2, py + H / 2 + 1); }
    if (c === 'C') { g.fillStyle = '#5fcf7a'; g.fillRect(px + 3, py + 3, H - 6, H - 6); g.font = `${H * 0.55}px sans-serif`; g.fillText('🚪', px + H / 2, py + H / 2 + 1); }
  }));
  const merkez = h => [h.x * H + H / 2, h.y * H + H / 2];
  const yolCiz = (yol, renk, kesik, kalin) => {
    g.strokeStyle = renk; g.lineWidth = kalin; g.setLineDash(kesik ? [6, 6] : []); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); yol.forEach((h, i) => { const [a, b] = merkez(h); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke(); g.setLineDash([]);
  };
  if ($('kuralsiz').checked && serbest.durum === 'tamam') yolCiz(serbest.yol, 'rgba(95,215,255,0.85)', true, 3);
  if (sonuc.durum === 'tamam') yolCiz(sonuc.yol, '#ffcf3a', false, 5);
  // Araba
  const konum = suruluyor ? suruluyor.yol[Math.min(suruluyor.i, suruluyor.yol.length - 1)] : plan.arac;
  if (konum) { g.fillStyle = '#fff1d2'; g.beginPath(); g.arc(konum.x * H + H / 2, konum.y * H + H / 2, H * 0.42, 0, 7); g.fill(); g.font = `${H * 0.62}px sans-serif`; g.fillText('🚙', konum.x * H + H / 2, konum.y * H + H / 2 + 1); }
  sonucYaz(sonuc, serbest, kapan.size);
}

function sonucYaz(s, z, kapanSay) {
  const k = $('sonuc');
  k.classList.toggle('kapali', s.durum === 'kapali');
  if (s.durum === 'arac-yok') { k.innerHTML = '<h2>Sonuç</h2><p>Önce 🚙 fırçasıyla arabamı koymalıyım.</p>'; return; }
  if (s.durum === 'cikis-yok') { k.innerHTML = '<h2>Sonuç</h2><p>Önce 🚪 fırçasıyla bir çıkış koymalıyım.</p>'; return; }
  const lejant = `<div class="lejant"><span><b style="background:#ffcf3a"></b>yasal yol</span><span><b style="background:#5fd7ff"></b>kurallar olmasa</span><span><b style="background:#8a2a22;height:10px;width:10px"></b>kapan</span></div>`;
  if (s.durum === 'kapali') {
    k.innerHTML = `<h2>Sonuç</h2><div class="dev">Kapana kısıldın!</div>
      <p>Kurallara uyarak gidebildiğim ${s.gidilen.length} hücrenin hiçbirinden çıkışa yol yok.${z.durum === 'tamam' ? ` Kurallar olmasa ${z.adim} adımda çıkardım.` : ' Kurallar olmasa da çıkış kapalı.'}</p>
      <div class="uyari">Tek yönlerden birini çevirmeli ya da bir park yerini açmalıyım. Kaçış odası gerçekten otoparkmış. 🔒</div>${lejant}`;
    return;
  }
  const kat = z.adim > 0 ? s.adim / z.adim : 1;
  k.innerHTML = `<h2>Sonuç</h2><div class="dev">${s.adim} <small>adımda çıkıştayım</small></div>
    <div class="karsilastir"><div class="yasal"><b>${s.adim} adım · ${s.donus} dönüş</b><span>kurallara uyarak</span></div>
    <div class="serbest"><b>${z.adim} adım</b><span>tek yönler olmasa</span></div></div>
    <p>${kat > 1.01 ? `Tek yönler yolumu <b>${kat.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kat</b> uzatıyor.` : 'Tek yönler yolumu uzatmıyor.'}</p>
    ${kapanSay ? `<div class="uyari">Dikkat: kırmızı ${kapanSay} hücreye girersem oradan bir daha çıkışa ulaşamam.</div>` : ''}${lejant}`;
}

function metinYaz() { $('metin').value = yaz(plan); $('metinNot').textContent = ''; }
$('metin').oninput = () => {
  const p = oku($('metin').value);
  if (!p.boy || p.en < 2 || p.en > 40 || p.boy > 30) { $('metinNot').textContent = 'Bu metni plan olarak okuyamadım (en fazla 40 × 30).'; return; }
  plan = p; suruluyor = null; kaydet(); boyutYaz(); ciz();
  $('metinNot').textContent = `Okundu: ${p.en} × ${p.boy}.`;
};

// ---------- Boyama ----------
let boyuyor = false;
function hucre(e) {
  const r = tuval.getBoundingClientRect();
  return { x: Math.floor((e.clientX - r.left) / r.width * plan.en), y: Math.floor((e.clientY - r.top) / r.height * plan.boy) };
}
function boyaHucre(e) {
  const { x, y } = hucre(e);
  if (plan.izgara[y]?.[x] === undefined || plan.izgara[y][x] === firca) return;
  plan = boya(plan, x, y, firca); suruluyor = null; kaydet(); ciz(); metinYaz();
}
tuval.addEventListener('pointerdown', e => { boyuyor = true; tuval.setPointerCapture(e.pointerId); boyaHucre(e); });
tuval.addEventListener('pointermove', e => { if (boyuyor && firca !== 'A') boyaHucre(e); });
const bitir = () => { boyuyor = false; };
tuval.addEventListener('pointerup', bitir); tuval.addEventListener('pointercancel', bitir);
$('kuralsiz').onchange = ciz;

// ---------- Sür ----------
$('sur').onclick = () => {
  const s = enKisaYol(plan);
  const yol = s.durum === 'tamam' ? s.yol : ulasilabilir(plan);
  if (!yol.length) return;
  suruluyor = { yol, i: 0 };
  const adim = () => {
    if (!suruluyor) return;
    ciz();
    if (suruluyor.i >= suruluyor.yol.length - 1) { setTimeout(() => { suruluyor = null; ciz(); }, 900); return; }
    suruluyor.i++; setTimeout(adim, 140);
  };
  adim();
};

function hepsi(metin = true) { boyutYaz(); ciz(); if (metin) metinYaz(); else metinYaz(); }
fircaGoster();
hepsi();
