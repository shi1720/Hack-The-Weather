import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Intentionally targets only Kavu resources. It does not enable billing, create
// credentials, alter other Hosting sites, or change project-wide IAM.
const root = fileURLToPath(new URL('..', import.meta.url));
const hostingProject = 'gen-lang-client-0444960702';
const dataProject = 'kavu-drying';
const region = 'europe-west1';
const site = 'kavu-drying';
const origin = `https://${site}.web.app`;
const runtime = `kavu-runtime@${hostingProject}.iam.gserviceaccount.com`;
const tag = `release-${new Date().toISOString().replaceAll(/[^0-9]/g, '')}`;
const image = `${region}-docker.pkg.dev/${hostingProject}/kavu/api:${tag}`;
const run = (bin, args, env = process.env) =>
  execFileSync(bin, args, { cwd: root, stdio: 'inherit', env });

const rc = JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8'));
if (rc.targets?.[hostingProject]?.hosting?.kavu?.join(',') !== site)
  throw new Error('The kavu Hosting target must name only kavu-drying.');
if (process.env.VITE_DEMO_ONLY || process.env.VITE_BASE_PATH)
  throw new Error('Unset VITE_DEMO_ONLY and VITE_BASE_PATH before deploying real accounts.');

run('npm', ['run', 'check']);
run('npm', ['run', 'lint']);
run('gcloud', [
  'builds',
  'submit',
  '--project',
  hostingProject,
  '--tag',
  image,
  '--timeout=1200s',
  '.',
]);
run('gcloud', [
  'run',
  'deploy',
  'kavu-api',
  '--project',
  hostingProject,
  '--region',
  region,
  '--image',
  image,
  '--service-account',
  runtime,
  '--allow-unauthenticated',
  '--port=8080',
  '--cpu=1',
  '--memory=1Gi',
  '--min-instances=0',
  '--max-instances=2',
  '--concurrency=20',
  '--timeout=60',
  '--quiet',
  '--set-env-vars',
  [
    '^|^DATA_STORE=firestore',
    `GOOGLE_CLOUD_PROJECT=${dataProject}`,
    'FIRESTORE_DATABASE_ID=(default)',
    'FIRESTORE_COLLECTION_PREFIX=kavu',
    'SESSION_COOKIE_NAME=__session',
    'NODE_ENV=production',
    'HOST=0.0.0.0',
    `APP_ORIGIN=${origin}`,
    `APP_ADDITIONAL_ORIGINS=https://${site}.firebaseapp.com`,
    'TRUST_PROXY_HOPS=1',
    'WEATHER_USER_AGENT=Kavu/2.0 https://github.com/shi1720/Hack-The-Weather',
  ].join('|'),
]);
run('npm', [
  'exec',
  '--yes',
  '--package=firebase-tools@15.30.2',
  '--',
  'firebase',
  'deploy',
  '--project',
  hostingProject,
  '--only',
  'hosting:kavu',
  '--non-interactive',
]);

const health = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(60_000) });
if (!health.ok) throw new Error(`Hosted health check failed with HTTP ${health.status}.`);
console.log(`Kavu deployed: ${origin}\nImage: ${image}\nHealth: ${await health.text()}`);
