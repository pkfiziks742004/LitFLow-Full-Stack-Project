import app from './app.js';
import { connectToDatabase } from './config/db.js';
import { env, isProduction } from './config/env.js';
import { ensureSeedAdminUser } from './admin/services/adminSeedService.js';
import { hydrateQuotaRuntimeConfig } from './services/quotaService.js';

const PORT_IN_USE_CODE = 'EADDRINUSE';

async function fetchWithTimeout(url, timeoutMs = 1000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function findExistingLitFlowApi(port) {
  const healthUrls = [`http://127.0.0.1:${port}/api/health`, `http://localhost:${port}/api/health`];

  for (const url of healthUrls) {
    const body = await fetchWithTimeout(url);

    if (body?.success === true && body?.service === env.appName && body?.status === 'ok') {
      return url;
    }
  }

  return null;
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
}

function installShutdownHandlers(server) {
  const shutdown = (signal) => {
    console.log(`${signal} received. Closing LitFlow API...`);
    server.close((error) => {
      if (error) {
        console.error('Failed to close LitFlow API cleanly:', error);
        process.exit(1);
      }

      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

async function bootstrap() {
  if (!isProduction) {
    const existingApiUrl = await findExistingLitFlowApi(env.port);

    if (existingApiUrl) {
      console.log(`LitFlow API is already running on port ${env.port} (${existingApiUrl}).`);
      console.log('Use the existing server, or stop it before starting a new one.');
      return;
    }
  }

  await connectToDatabase();
  await ensureSeedAdminUser({ syncPassword: env.adminSeedRecoveryEnabled, clearLock: false });
  await hydrateQuotaRuntimeConfig();

  const server = await listen(env.port);
  installShutdownHandlers(server);
  console.log(`LitFlow API listening on port ${env.port}`);
}

bootstrap().catch((error) => {
  if (error?.code === PORT_IN_USE_CODE) {
    console.error(`Port ${env.port} is already in use.`);
    console.error('Close the process using that port, or set a different PORT in server/.env.');
    process.exit(1);
  }

  console.error('Failed to start LitFlow API:', error);
  process.exit(1);
});
