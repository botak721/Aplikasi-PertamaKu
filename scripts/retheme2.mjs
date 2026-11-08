import fs from "node:fs";
import path from "node:path";

function jelajah(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return jelajah(p);
    return e.name.endsWith(".tsx") ? [p] : [];
  });
}

const files = [...jelajah("src/components"), ...jelajah("src/app")];

const warna = [
  [/(['"])#0E1B5C\1/gi, "$1#0A0F1E$1"], // tinta gelap baru
  [/(['"])#c60\1/gi, "$1#2547D0$1"], // oranye -> biru
  [/(['"])#f59e0b\1/gi, "$1#5B6785$1"], // oranye (penanda peta) -> abu-biru
];

let berubah = 0;
const sisaYellow = [];

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const asli = s;
  const nama = path.basename(f);

  for (const [re, ganti] of warna) s = s.replace(re, ganti);

  if (nama === "admin-home.tsx") {
    s = s.replace(/color:\s*C\.yellow/g, "color: '#fff'");
  }
  if (nama === "teman-belajar.tsx") {
    s = s.replace(
      /\[C\.primary,\s*C\.yellow,\s*(['"])#BFD3FF\1,?\s*\]/,
      "['#BFD3FF', '#DDE5F7', '#C9D6F5']",
    );
  }
  if (nama === "promo-screen.tsx") {
    s = s.replace(/C\.yellow/g, "C.primary");
    s = s.replace(/(codeBtnText:\s*\{[^}]*color:\s*)C\.navy/, "$1'#fff'");
  }
  if (nama === "rating-screen.tsx") {
    s = s.replace(/C\.yellow/g, "C.primary");
  }
  if (nama === "customer-home.tsx") {
    s = s.replace(/C\.yellow/g, "C.ink");
  }

  if (/C\.yellow/.test(s)) sisaYellow.push(nama);

  if (s !== asli) {
    fs.writeFileSync(f, s, "utf8");
    berubah++;
    console.log("diperbarui:", f);
  }
}

console.log(`\nSelesai. ${berubah} file diperbarui.`);
if (sisaYellow.length) {
  console.log("MASIH ada C.yellow di:", sisaYellow.join(", "));
} else {
  console.log("Tidak ada sisa C.yellow.");
}
