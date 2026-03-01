import { createWriteStream, existsSync } from 'node:fs';
import { copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';
import { createDownloadProgressTransform } from './download-progress.js';

interface DownloadEcmacraftOptions {
  filePath: string;
  version?: string;
  showProgress?: boolean;
  cacheDir?: string;
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

async function fetchEcmacraftRelease(version?: string): Promise<GitHubRelease> {
  const metadataUrl = version
    ? `https://api.github.com/repos/twlite/ecmacraft/releases/tags/${version}`
    : 'https://api.github.com/repos/twlite/ecmacraft/releases/latest';

  const metadataResponse = await fetch(metadataUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ecmacraft-cli',
    },
  });

  if (!metadataResponse.ok) {
    throw new Error(
      `Failed to fetch EcmaCraft release metadata: ${metadataResponse.status} ${metadataResponse.statusText}`,
    );
  }

  return (await metadataResponse.json()) as GitHubRelease;
}

function ecmacraftCacheFileName(tag: string): string {
  return `ecmacraft-${tag}.jar`;
}

export async function downloadEcmacraft(options: DownloadEcmacraftOptions) {
  const { filePath, version, showProgress = false, cacheDir } = options;

  // If no version specified, check for any cached ecmacraft jar to avoid API calls
  if (cacheDir && !version && existsSync(cacheDir)) {
    const files = await readdir(cacheDir);
    const cached = files.find((f: string) => f.startsWith('ecmacraft-') && f.endsWith('.jar'));
    if (cached) {
      const cachePath = join(cacheDir, cached);
      if (showProgress) {
        console.log(`[ecmacraft] Using cached ${cached}`);
      }
      await copyFile(cachePath, filePath);
      return;
    }
  }

  const release = await fetchEcmacraftRelease(version);
  const asset = release.assets.find((candidate) => candidate.name === 'ecmacraft.jar');
  if (!asset) {
    throw new Error(`Release ${release.tag_name} does not include an ecmacraft.jar asset.`);
  }

  // Check cache by resolved tag
  if (cacheDir) {
    const cachePath = join(cacheDir, ecmacraftCacheFileName(release.tag_name));
    if (existsSync(cachePath)) {
      if (showProgress) {
        console.log(`[ecmacraft] Using cached ecmacraft.jar (${release.tag_name})`);
      }
      await copyFile(cachePath, filePath);
      return;
    }
  }

  if (showProgress) {
    console.log(`[ecmacraft] Downloading ecmacraft.jar (${release.tag_name}) from ${asset.browser_download_url}`);
  }

  const downloadResponse = await fetch(asset.browser_download_url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': 'ecmacraft-cli',
    },
  });

  if (!downloadResponse.ok) {
    throw new Error(`Failed to download ecmacraft.jar: ${downloadResponse.status} ${downloadResponse.statusText}`);
  }

  if (!downloadResponse.body) {
    throw new Error('Release asset response body is null.');
  }

  const bodyStream = Readable.fromWeb(downloadResponse.body as ReadableStream);
  const progressStream = createDownloadProgressTransform(downloadResponse.headers.get('content-length'), showProgress);

  const fileStream = createWriteStream(filePath);
  await pipeline(progressStream ? bodyStream.pipe(progressStream) : bodyStream, fileStream);

  if (showProgress) {
    console.log(`[ecmacraft] Downloaded ecmacraft.jar to ${filePath}`);
  }

  // Save to cache
  if (cacheDir) {
    const cachePath = join(cacheDir, ecmacraftCacheFileName(release.tag_name));
    await copyFile(filePath, cachePath);
  }
}
