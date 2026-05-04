// Per-entry Vite build for Twitch extensions.
// Outputs IIFE bundles (classic scripts, no type="module") so Twitch's CSP
// (script-src 'self', no 'unsafe-inline', no module-script support assumed)
// loads each entry as a single external .js file with no dynamic imports.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, rmSync, renameSync, existsSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const entries = ['panel', 'overlay', 'config', 'mobile', 'live-config'];
const finalDist = resolve(__dirname, 'dist');

if (existsSync(finalDist)) rmSync(finalDist, { recursive: true, force: true });
mkdirSync(finalDist, { recursive: true });
mkdirSync(resolve(finalDist, 'assets'), { recursive: true });

for (const entry of entries) {
  const tmpOut = resolve(__dirname, `dist-${entry}`);
  console.log(`\n── Building ${entry}.html ─────────────────`);
  await build({
    configFile: false,
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@creator-bio-hub/types': resolve(__dirname, '../../shared/types/src/index.ts'),
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: tmpOut,
      emptyOutDir: true,
      modulePreload: false,
      cssCodeSplit: false,
      rollupOptions: {
        input: resolve(__dirname, `${entry}.html`),
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          entryFileNames: `${entry}.js`,
          assetFileNames: (info) => {
            if (info.name && info.name.endsWith('.css')) return `${entry}.css`;
            return '[name].[ext]';
          },
        },
      },
    },
    logLevel: 'warn',
  });

  // Move outputs (HTML + assets) to final dist, merging assets dir
  const moveRecursive = (srcDir, dstDir) => {
    for (const name of readdirSync(srcDir)) {
      const srcPath = resolve(srcDir, name);
      const dstPath = resolve(dstDir, name);
      if (statSync(srcPath).isDirectory()) {
        if (!existsSync(dstPath)) mkdirSync(dstPath, { recursive: true });
        moveRecursive(srcPath, dstPath);
      } else {
        renameSync(srcPath, dstPath);
      }
    }
  };
  moveRecursive(tmpOut, finalDist);
  rmSync(tmpOut, { recursive: true, force: true });

  // Strip type="module" + crossorigin from the HTML so Twitch CSP accepts it
  const htmlPath = resolve(finalDist, `${entry}.html`);
  let html = readFileSync(htmlPath, 'utf8');
  html = html.replace(/\s+type="module"/g, '');
  html = html.replace(/\s+crossorigin/g, '');
  // Drop modulepreload (not needed; everything is inlined into the entry bundle)
  html = html.replace(/<link\s+rel="modulepreload"[^>]*>/g, '');
  // Move entry script from <head> to end of <body> so DOM is ready when it runs
  const entryScriptTag = `<script src="./${entry}.js"></script>`;
  if (html.includes(entryScriptTag)) {
    html = html.replace(entryScriptTag, '');
    html = html.replace('</body>', `  ${entryScriptTag}\n  </body>`);
  }
  writeFileSync(htmlPath, html);
}

// Copy public assets (smoke-bg.png etc.)
const publicDir = resolve(__dirname, 'public');
if (existsSync(publicDir)) {
  for (const file of readdirSync(publicDir)) {
    copyFileSync(resolve(publicDir, file), resolve(finalDist, file));
  }
}

console.log('\n✓ Built — IIFE classic scripts, no module loading');
