import { execSync, spawn } from 'child_process';
import http from 'http';

const PORT = 5173;
const force = process.argv.includes('--force');

const portPids = () => {
  try {
    return execSync(`lsof -ti :${PORT}`, { encoding: 'utf8' })
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
};

const killPort = () => {
  for (const pid of portPids()) {
    try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
  }
};

const waitPortFree = async (maxMs = 5000) => {
  const start = Date.now();
  while (portPids().length && Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 80));
  }
};

const serverHealthy = () =>
  new Promise(resolve => {
    const req = http.get(`http://localhost:${PORT}/`, res => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });

const printReady = () => {
  console.log('\n  VITE v6.4.2  ready');
  console.log(`  ➜  Local:   http://localhost:${PORT}/\n`);
};

const startVite = () => {
  const child = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });
  child.on('exit', code => process.exit(code ?? 0));
};

const main = async () => {
  if (!force && await serverHealthy()) {
    printReady();
    process.exit(0);
    return;
  }

  killPort();
  await waitPortFree();

  if (portPids().length) {
    console.error(`\n  Could not free port ${PORT}. Stop other dev servers and retry.\n`);
    process.exit(1);
    return;
  }

  startVite();
};

main();
