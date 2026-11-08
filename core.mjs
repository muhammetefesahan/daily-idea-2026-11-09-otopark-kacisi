// Otopark Kaçışı: tek yön okları olan bir otoparkta çıkışa en kısa yasal yol.
// Plan karakterlerle yazılıyor:
//   #  duvar            .  çift yönlü yol      P  park etmiş araba (geçilmez)
//   >  <  ^  v  tek yön (okun gösterdiği yöne)  A  benim arabam      C  çıkış

export const YONLER = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], 'v': [0, 1] };
const ADIMLAR = [[1, 0, '>'], [-1, 0, '<'], [0, -1, '^'], [0, 1, 'v']];
const TERS = { '>': '<', '<': '>', '^': 'v', 'v': '^' };
export const GECILIR = c => c !== '#' && c !== 'P' && c !== undefined;

export function oku(metin) {
  const satirlar = String(metin).replace(/\r/g, '').split('\n').filter(s => s.length);
  const en = Math.max(0, ...satirlar.map(s => s.length));
  const izgara = satirlar.map(s => [...s.padEnd(en, '#')].map(c => ('#.P><^vAC'.includes(c) ? c : '#')));
  let arac = null; const cikislar = [];
  izgara.forEach((r, y) => r.forEach((c, x) => {
    if (c === 'A') { if (!arac) arac = { x, y }; else r[x] = '.'; }   // tek araba
    if (c === 'C') cikislar.push({ x, y });
  }));
  return { izgara, en, boy: izgara.length, arac, cikislar };
}
export const yaz = p => p.izgara.map(r => r.join('')).join('\n');

// A'dan B'ye (yön m) geçmek yasal mı?
// - Tek yönlü bir hücrede okun tersine gidemezsin (geri geri çıkamazsın).
// - Tek yönlü bir hücreye okun tersi yönünde giremezsin.
// - Yana dönmek serbest.
export function gecerMi(p, x, y, dx, dy, m, kurallar = true) {
  const b = p.izgara[y + dy]?.[x + dx];
  if (!GECILIR(b)) return false;
  if (!kurallar) return true;
  const a = p.izgara[y][x];
  if (YONLER[a] && m === TERS[a]) return false;
  if (YONLER[b] && m === TERS[b]) return false;
  return true;
}

// En kısa yol (BFS). Her adım bir hücre.
export function enKisaYol(p, kurallar = true) {
  if (!p.arac) return { durum: 'arac-yok' };
  if (!p.cikislar.length) return { durum: 'cikis-yok' };
  const anahtar = (x, y) => y * p.en + x;
  const onceki = new Map([[anahtar(p.arac.x, p.arac.y), null]]);
  const kuyruk = [p.arac];
  let bulunan = null;
  for (let i = 0; i < kuyruk.length; i++) {
    const { x, y } = kuyruk[i];
    if (p.izgara[y][x] === 'C') { bulunan = { x, y }; break; }
    for (const [dx, dy, m] of ADIMLAR) {
      if (!gecerMi(p, x, y, dx, dy, m, kurallar)) continue;
      const k = anahtar(x + dx, y + dy);
      if (onceki.has(k)) continue;
      onceki.set(k, anahtar(x, y));
      kuyruk.push({ x: x + dx, y: y + dy });
    }
  }
  const gidilen = [...onceki.keys()].map(k => ({ x: k % p.en, y: Math.floor(k / p.en) }));
  if (!bulunan) return { durum: 'kapali', gidilen };
  const yol = [];
  for (let k = anahtar(bulunan.x, bulunan.y); k !== null; k = onceki.get(k)) yol.unshift({ x: k % p.en, y: Math.floor(k / p.en) });
  return { durum: 'tamam', yol, adim: yol.length - 1, donus: donusSayisi(yol), gidilen };
}

export function donusSayisi(yol) {
  let n = 0;
  for (let i = 2; i < yol.length; i++) {
    const a = [yol[i - 1].x - yol[i - 2].x, yol[i - 1].y - yol[i - 2].y], b = [yol[i].x - yol[i - 1].x, yol[i].y - yol[i - 1].y];
    if (a[0] !== b[0] || a[1] !== b[1]) n++;
  }
  return n;
}

// Arabanın kurallara uyarak gidebildiği bütün hücreler (çıkışı bulunca durmadan)
export function ulasilabilir(p, kurallar = true) {
  if (!p.arac) return [];
  const k = (x, y) => y * p.en + x;
  const gordum = new Set([k(p.arac.x, p.arac.y)]);
  const kuyruk = [p.arac];
  for (let i = 0; i < kuyruk.length; i++) {
    const { x, y } = kuyruk[i];
    for (const [dx, dy, m] of ADIMLAR) {
      if (!gecerMi(p, x, y, dx, dy, m, kurallar) || gordum.has(k(x + dx, y + dy))) continue;
      gordum.add(k(x + dx, y + dy)); kuyruk.push({ x: x + dx, y: y + dy });
    }
  }
  return kuyruk;
}

// Arabanın gidebildiği ama oradan hiçbir çıkışa ulaşılamayan hücreler: "kapanlar"
export function kapanlar(p) {
  if (!p.arac) return [];
  const cikisaVarir = new Set();
  // Tersine BFS: çıkışlardan geriye doğru, kurallara uyarak bu hücreye gelinebilen hücreler
  const k = (x, y) => y * p.en + x;
  const kuyruk = p.cikislar.map(c => ({ ...c }));
  kuyruk.forEach(c => cikisaVarir.add(k(c.x, c.y)));
  for (let i = 0; i < kuyruk.length; i++) {
    const { x, y } = kuyruk[i];
    for (const [dx, dy, m] of ADIMLAR) {
      const ox = x - dx, oy = y - dy;                      // (ox,oy) -> (x,y), yön m
      if (!GECILIR(p.izgara[oy]?.[ox]) || cikisaVarir.has(k(ox, oy))) continue;
      if (!gecerMi(p, ox, oy, dx, dy, m)) continue;
      cikisaVarir.add(k(ox, oy)); kuyruk.push({ x: ox, y: oy });
    }
  }
  // Not: enKisaYol çıkışı bulunca durur; kapanları kaçırmamak için bütün ulaşılabilir hücrelere bakıyorum
  return ulasilabilir(p).filter(h => !cikisaVarir.has(k(h.x, h.y)));
}

// Planı düzenle: bir hücreyi değiştir (araba tek kalsın)
export function boya(p, x, y, c) {
  if (!p.izgara[y] || p.izgara[y][x] === undefined) return p;
  const izgara = p.izgara.map(r => r.slice());
  if (c === 'A') izgara.forEach(r => r.forEach((v, i) => { if (v === 'A') r[i] = '.'; }));
  izgara[y][x] = c;
  return oku(izgara.map(r => r.join('')).join('\n'));
}

// --- Uydurma örnekler ---
export const ORNEKLER = {
  donus: { ad: 'Çıkış yanımda ama…', plan: [
    '##############',
    '#.<<<<<<<<<<A#',
    '#vPPPPPPPPPP^#',
    '#v.....PPPPP^#',
    '#vPPPP.PPPPP^#',
    '#>>>>>>>>>>>^C',
    '##############',
  ].join('\n') },
  tuzak: { ad: 'Tuzak otopark', plan: [
    '############',
    '#A>>>>>>>v.#',
    '#PPPPPPP#v##',
    '#C.<<<<<<>.#',
    '############',
  ].join('\n') },
  bos: { ad: 'Boş plan', plan: [
    '############',
    '#A.........#',
    '#..........#',
    '#..........#',
    '#.........C#',
    '############',
  ].join('\n') },
};
