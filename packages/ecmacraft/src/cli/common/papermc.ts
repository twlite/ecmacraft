import { createWriteStream, existsSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';
import { createDownloadProgressTransform } from './download-progress.js';

interface DownloadPaperMcOptions {
  version: string;
  filePath: string;
  showProgress?: boolean;
  cacheDir?: string;
}

interface PaperProjectResponse {
  versions: Record<string, string[]>;
}

interface PaperBuildDownload {
  url: string;
}

interface PaperBuild {
  id: number;
  channel: string;
  downloads: {
    'server:default'?: PaperBuildDownload;
  };
}

const PAPERMC_PROJECT_ID = 'paper';
const PAPERMC_API_BASE_URL = 'https://fill.papermc.io/v3';
const PAPERMC_USER_AGENT = 'ecmacraft-cli/0.0.0 (https://github.com/twlite/ecmacraft)';

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map((part) => Number(part));
  const bParts = b.split('.').map((part) => Number(part));
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const left = aParts[index] ?? 0;
    const right = bParts[index] ?? 0;

    if (left > right) {
      return 1;
    }

    if (left < right) {
      return -1;
    }
  }

  return 0;
}

async function resolvePaperVersion(version: string): Promise<string> {
  if (version !== 'latest') {
    return version;
  }

  const response = await fetch(`${PAPERMC_API_BASE_URL}/projects/${PAPERMC_PROJECT_ID}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': PAPERMC_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve latest PaperMC version: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as PaperProjectResponse;
  const versions = Object.values(payload.versions).flat();
  const stableVersions = versions.filter((value) => /^\d+\.\d+(\.\d+)?$/.test(value));

  stableVersions.sort(compareVersions);

  const latest = stableVersions.at(-1);
  if (!latest) {
    throw new Error('Failed to resolve latest stable PaperMC version.');
  }

  return latest;
}

async function resolvePaperDownloadUrl(version: string): Promise<string> {
  const response = await fetch(`${PAPERMC_API_BASE_URL}/projects/${PAPERMC_PROJECT_ID}/versions/${version}/builds`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': PAPERMC_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve PaperMC builds for ${version}: ${response.status} ${response.statusText}`);
  }

  const builds = (await response.json()) as PaperBuild[];
  const latestStableBuild = builds
    .filter((build) => build.channel === 'STABLE' && build.downloads['server:default']?.url)
    .sort((left, right) => right.id - left.id)
    .at(0);

  const downloadUrl = latestStableBuild?.downloads['server:default']?.url;
  if (!downloadUrl) {
    throw new Error(`No stable PaperMC server download found for version ${version}.`);
  }

  return downloadUrl;
}

function paperCacheFileName(version: string): string {
  return `paper-${version}.jar`;
}

export async function downloadPaperMc(options: DownloadPaperMcOptions) {
  const { version, filePath, showProgress = false, cacheDir } = options;
  const resolvedVersion = await resolvePaperVersion(version);

  // Check cache
  if (cacheDir) {
    const cachePath = join(cacheDir, paperCacheFileName(resolvedVersion));
    if (existsSync(cachePath)) {
      if (showProgress) {
        console.log(`[ecmacraft] Using cached PaperMC ${resolvedVersion}`);
      }
      await copyFile(cachePath, filePath);
      return;
    }
  }

  const downloadUrl = await resolvePaperDownloadUrl(resolvedVersion);

  if (showProgress) {
    console.log(`[ecmacraft] Downloading PaperMC ${resolvedVersion} from ${downloadUrl}`);
  }

  const response = await fetch(downloadUrl, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': PAPERMC_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PaperMC version ${resolvedVersion}: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const stream = Readable.fromWeb(response.body as ReadableStream);
  const progressStream = createDownloadProgressTransform(response.headers.get('content-length'), showProgress);

  const fileStream = createWriteStream(filePath);

  await pipeline(progressStream ? stream.pipe(progressStream) : stream, fileStream);

  if (showProgress) {
    console.log(`[ecmacraft] PaperMC downloaded to ${filePath}`);
  }

  // Save to cache
  if (cacheDir) {
    const cachePath = join(cacheDir, paperCacheFileName(resolvedVersion));
    await copyFile(filePath, cachePath);
  }
}
