import fs from 'node:fs';

const files = [
  'src/components/customer-home.tsx',
  'src/components/merchant-home.tsx',
  'src/components/merchant-menu.tsx',
  'src/components/merchant-orders.tsx',
  'src/components/merchant-location.tsx',
  'src/components/driver-home.tsx',
  'src/components/titip-beli.tsx',
  'src/components/track-order.tsx',
];

const colors = {
  '#00AA13': '#2547D0',
  '#111': '#0E1B5C',
  '#333': '#0E1B5C',
  '#555': '#5B6785',
  '#666': '#5B6785',
  '#777': '#5B6785',
  '#888': '#5B6785',
  '#ccc': '#C9D6F5',
  '#e5e5e5': '#DDE5F7',
  '#fafafa': '#FFFFFF',
  '#2563eb': '#0E1B5C',
  '#d00': '#D92D20',
};

const fonts = {
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_600SemiBold',
  '600': 'PlusJakartaSans_600SemiBold',
  '700': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
  '900': 'PlusJakartaSans_800ExtraBold',
};

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log('lewati (tidak ada):', f);
    continue;
  }
  let s = fs.readFileSync(f, 'utf8');
  for (const [from, to] of Object.entries(colors)) {
    s = s.replace(new RegExp(`(['"])${from}\\1`, 'gi'), `$1${to}$1`);
  }
  s = s.replace(/borderRadius: 10(?!\d)/g, 'borderRadius: 14');
  s = s.replace(/fontWeight:\s*(['"])(\d{3})\1/g, (m, q, w) =>
    fonts[w] ? `fontFamily: '${fonts[w]}'` : m
  );
  fs.writeFileSync(f, s, 'utf8');
  console.log('selesai:', f);
}