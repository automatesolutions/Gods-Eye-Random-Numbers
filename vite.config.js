import { defineConfig, loadEnv } from 'vite';
import { SHEET_URLS, toCsvUrl } from './src/config.js';

function mergedSheetUrls(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const out = { ...SHEET_URLS };
  for (const id of Object.keys(out)) {
    out[id] = toCsvUrl(env[`VITE_SHEET_${id}`] || out[id] || '');
  }
  return out;
}

function sheetProxies(urls) {
  const proxy = {};
  for (const [id, url] of Object.entries(urls)) {
    if (!url) continue;
    try {
      const u = new URL(url);
      proxy[`/_sheets/${id}`] = {
        target: u.origin,
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        rewrite: () => u.pathname + u.search,
      };
    } catch {
      /* skip invalid URL */
    }
  }
  return proxy;
}

function sheetRedirectsPlugin(urls) {
  return {
    name: 'sheet-redirects',
    generateBundle() {
      const lines = [];
      for (const [id, url] of Object.entries(urls)) {
        if (url) lines.push(`/_sheets/${id}  ${url}  200`);
      }
      lines.push('/*  /index.html  200');
      this.emitFile({
        type: 'asset',
        fileName: '_redirects',
        source: lines.join('\n') + '\n',
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const urls = mergedSheetUrls(mode);
  return {
    plugins: [sheetRedirectsPlugin(urls)],
    server: { proxy: sheetProxies(urls) },
    preview: { proxy: sheetProxies(urls) },
  };
});
