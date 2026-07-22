/* Generates client/public/images-manifest.json — the product-image gallery
   that the admin ImagePicker reads. On Vercel the serverless function can't
   readdir the static images folder, so we bake the listing at build time.
   Re-run with `npm run gen:images` whenever you add/remove product images. */
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../client/public/images');
const OUT = path.join(__dirname, '../client/public/images-manifest.json');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const isImage = (name) => IMAGE_EXTS.has(path.extname(name).toLowerCase());
const toUrl = (...segs) => '/images/' + segs.map(encodeURIComponent).join('/');

function build() {
  const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
  const groups = [];

  const dirs = entries
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const dir of dirs) {
    const files = fs
      .readdirSync(path.join(IMAGES_DIR, dir.name), { withFileTypes: true })
      .filter((e) => e.isFile() && isImage(e.name))
      .map((e) => ({ name: e.name, url: toUrl(dir.name, e.name) }));
    if (files.length) groups.push({ folder: dir.name, files });
  }

  const rootFiles = entries
    .filter((e) => e.isFile() && isImage(e.name))
    .map((e) => ({ name: e.name, url: toUrl(e.name) }));
  if (rootFiles.length) groups.push({ folder: 'Other', files: rootFiles });

  return { groups };
}

fs.writeFileSync(OUT, JSON.stringify(build(), null, 2));
console.log('Wrote', path.relative(process.cwd(), OUT));
