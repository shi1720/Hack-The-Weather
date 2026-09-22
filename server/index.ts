import { createApp } from './app';
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be between 1 and 65535.');
const trustProxy = process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : undefined;
if (trustProxy !== undefined && (!Number.isInteger(trustProxy) || trustProxy < 1 || trustProxy > 5))
  throw new Error('TRUST_PROXY_HOPS must be an integer between 1 and 5.');
const { app, store, cleanup, close } = createApp({ trustProxy });
await store.health();
const runCleanup = () => {
  void cleanup().catch(() => console.error('[kavu] scheduled cleanup failed'));
};
runCleanup();
const timer = setInterval(runCleanup, 60 * 60_000).unref();
const server = app.listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(`Kavu listening on port ${port}`),
);
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
let shuttingDown = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(timer);
    server.close(() => {
      void close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
