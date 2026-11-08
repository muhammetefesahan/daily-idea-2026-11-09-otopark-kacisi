import assert from 'node:assert/strict';
import { ulasilabilir, YONLER, GECILIR, oku, yaz, gecerMi, enKisaYol, donusSayisi, kapanlar, boya, ORNEKLER } from './core.mjs';

let checks = 0;
const ok = fn => { fn(); checks++; };

// 1. Okuma
const p = oku('#####\n#A.C#\n#####');
ok(() => assert.deepEqual(p.arac, { x: 1, y: 1 }));
ok(() => assert.deepEqual(p.cikislar, [{ x: 3, y: 1 }]));
ok(() => assert.equal(p.en, 5)); ok(() => assert.equal(p.boy, 3));
ok(() => assert.equal(yaz(p), '#####\n#A.C#\n#####'));
const iki = oku('#AA.C#');                       // ikinci araba yola dönüşür
ok(() => assert.equal(yaz(iki), '#A..C#'));
ok(() => assert.equal(yaz(oku('#A?C\n#')), '#A#C\n####'));   // tanınmayan karakter duvar, kısa satır doldurulur
ok(() => assert.ok(!GECILIR('#') && !GECILIR('P') && GECILIR('>') && GECILIR('C')));

// 2. Tek yön kuralları
const t = oku('#.>.#');
ok(() => assert.ok(gecerMi(t, 1, 0, 1, 0, '>')));           // oka doğru girmek serbest
ok(() => assert.ok(!gecerMi(t, 3, 0, -1, 0, '<')));         // oka ters girmek yasak
ok(() => assert.ok(!gecerMi(t, 2, 0, -1, 0, '<')));         // oktan geri çıkmak yasak
ok(() => assert.ok(gecerMi(t, 2, 0, 1, 0, '>')));
ok(() => assert.ok(gecerMi(t, 3, 0, -1, 0, '<', false)));   // kurallar kapalıysa serbest
const yan = oku('#.#\n.>.\n#.#');
ok(() => assert.ok(gecerMi(yan, 1, 1, 0, -1, '^')));         // tek yönden yana dönmek serbest
ok(() => assert.ok(gecerMi(yan, 1, 0, 0, 1, 'v')));          // tek yöne yandan girmek serbest
ok(() => assert.ok(!gecerMi(oku('#P#'), 0, 0, 1, 0, '>')));  // park etmiş arabaya girilmez

// 3. Örnekler
const d = oku(ORNEKLER.donus.plan);
const dk = enKisaYol(d), dz = enKisaYol(d, false);
ok(() => assert.equal(dk.durum, 'tamam'));
ok(() => assert.equal(dk.adim, 27));
ok(() => assert.equal(dz.adim, 5));                       // kurallar olmasa çıkış 5 adım
ok(() => assert.equal(dk.donus, 4));
ok(() => assert.deepEqual(dk.yol[0], d.arac));
ok(() => assert.equal(d.izgara[dk.yol.at(-1).y][dk.yol.at(-1).x], 'C'));
// Yoldaki her adım komşu ve yasal
ok(() => assert.ok(dk.yol.slice(1).every((h, i) => {
  const o = dk.yol[i], dx = h.x - o.x, dy = h.y - o.y;
  const m = Object.entries(YONLER).find(([, v]) => v[0] === dx && v[1] === dy)?.[0];
  return Math.abs(dx) + Math.abs(dy) === 1 && gecerMi(d, o.x, o.y, dx, dy, m);
})));
const tz = oku(ORNEKLER.tuzak.plan);
ok(() => assert.equal(enKisaYol(tz).durum, 'kapali'));
ok(() => assert.equal(enKisaYol(tz, false).durum, 'tamam'));
ok(() => assert.equal(kapanlar(tz).length, enKisaYol(tz).gidilen.length));   // her yer kapan
ok(() => assert.equal(kapanlar(d).length, 0));
ok(() => assert.equal(enKisaYol(oku('#.C#')).durum, 'arac-yok'));
ok(() => assert.equal(enKisaYol(oku('#A.#')).durum, 'cikis-yok'));
ok(() => assert.equal(enKisaYol(oku('#AC#')).adim, 1));

// 4. Dönüş sayısı
ok(() => assert.equal(donusSayisi([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]), 0));
ok(() => assert.equal(donusSayisi([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }]), 2));

// 5. Kaba kuvvetle karşılaştırma: küçük rastgele otoparklarda bütün basit yolları dene
let tohum = 13; const rnd = () => (tohum = (tohum * 48271) % 2147483647) / 2147483647;
function kaba(plan) {
  let en = Infinity;
  const gez = (x, y, uzun, ziyaret) => {
    if (uzun >= en) return;
    if (plan.izgara[y][x] === 'C') { en = uzun; return; }
    for (const [m, [dx, dy]] of Object.entries(YONLER)) {
      const k = `${x + dx},${y + dy}`;
      if (ziyaret.has(k) || !gecerMi(plan, x, y, dx, dy, m)) continue;
      ziyaret.add(k); gez(x + dx, y + dy, uzun + 1, ziyaret); ziyaret.delete(k);
    }
  };
  gez(plan.arac.x, plan.arac.y, 0, new Set([`${plan.arac.x},${plan.arac.y}`]));
  return en;
}
let ayni = true, kapaliSay = 0;
for (let n = 0; n < 150; n++) {
  const W = 5, H = 4, harf = '..>.<.^v.P';
  const sat = Array.from({ length: H }, () => Array.from({ length: W }, () => harf[Math.floor(rnd() * harf.length)]));
  sat[0][0] = 'A'; sat[H - 1][W - 1] = 'C';
  const plan = oku(sat.map(r => r.join('')).join('\n'));
  const b = enKisaYol(plan), k = kaba(plan);
  if (b.durum === 'kapali') { kapaliSay++; if (k !== Infinity) ayni = false; }
  else if (b.adim !== k) ayni = false;
}
ok(() => assert.ok(ayni, 'BFS kaba kuvvetle uyuşmuyor'));
ok(() => assert.ok(kapaliSay > 10 && kapaliSay < 140));   // hem kapalı hem açık örnekler denendi

// 6. Kapanlar: her kapandan çıkışa gerçekten gidilemiyor
const karisik = oku([
  '#########',
  '#A....v##',
  '#.PPPPv.#',
  '#....C>.#',
  '#########',
].join('\n'));
const kp = kapanlar(karisik);
ok(() => assert.deepEqual(kp.map(h => `${h.x},${h.y}`).sort(), ['6,2', '6,3', '7,2', '7,3']));   // sağdaki döngü
ok(() => assert.ok(kp.every(h => enKisaYol({ ...karisik, arac: h }).durum === 'kapali')));   // okları silmeden arabayı oraya koy
ok(() => assert.equal(enKisaYol(karisik).durum, 'tamam'));
ok(() => assert.ok(ulasilabilir(karisik).length > enKisaYol(karisik).gidilen.length));   // en kısa yol araması erken duruyor

// 7. Boyama
const b2 = boya(oku(ORNEKLER.bos.plan), 5, 2, 'P');
ok(() => assert.equal(b2.izgara[2][5], 'P'));
const b3 = boya(b2, 3, 3, 'A');
ok(() => assert.deepEqual(b3.arac, { x: 3, y: 3 }));
ok(() => assert.equal(yaz(b3).split('A').length - 1, 1));     // tek araba kaldı
ok(() => assert.equal(boya(b2, 99, 99, 'P'), b2));

console.log(`${checks} kontrol geçti.`);
