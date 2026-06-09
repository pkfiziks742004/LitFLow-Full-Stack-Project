import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const snapshotDirPath = path.resolve(currentDirPath, '../../.runtime');
const snapshotFilePath = path.join(snapshotDirPath, 'public-site-config.json');

export async function readPublicSiteConfigSnapshot() {
  try {
    const raw = await readFile(snapshotFilePath, 'utf8');
    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

export async function writePublicSiteConfigSnapshot(config) {
  await mkdir(snapshotDirPath, { recursive: true });
  await writeFile(snapshotFilePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
