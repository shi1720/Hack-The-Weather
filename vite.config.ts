import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Cache only the public sandbox. Authenticated API responses are never cached. */
function offlineDemo(): Plugin {
  return {
    name: 'kavu-offline-demo',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (process.env.VITE_DEMO_ONLY !== 'true') return;
      const base = process.env.VITE_BASE_PATH || '/';
      const assets = [
        ...Object.keys(bundle).filter((p) => !p.endsWith('.map')),
        'data/conduit.json',
        'favicon.svg',
        'manifest.webmanifest',
      ];
      const revision = createHash('sha256')
        .update(assets.join('|'))
        .update(readFileSync('public/data/conduit.json'))
        .digest('hex')
        .slice(0, 12);
      const source = `const CACHE='kavu-demo-${revision}';
const FILES=${JSON.stringify([base, ...assets.map((p) => base + p)])};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kavu-demo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('${base}',copy)));}return response;}).catch(()=>caches.match('${base}')));return;}
event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;})));});`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
export default defineConfig({
  plugins: [react(), offlineDemo()],
  base: process.env.VITE_BASE_PATH || '/',
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: { sourcemap: true },
});
