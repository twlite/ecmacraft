import { Transform } from 'node:stream';

const PROGRESS_BAR_WIDTH = 32;

function renderProgressBar(downloadedBytes: number, totalBytes: number): string {
  const ratio = Math.min(downloadedBytes / totalBytes, 1);
  const percent = Math.floor(ratio * 100);
  const completedWidth = Math.floor(ratio * PROGRESS_BAR_WIDTH);
  const remainingWidth = PROGRESS_BAR_WIDTH - completedWidth;
  const bar = `${'#'.repeat(completedWidth)}${'='.repeat(remainingWidth)}`;

  return `[${bar}] ${String(percent).padStart(3, ' ')}%`;
}

export function createDownloadProgressTransform(
  contentLengthHeader: string | null,
  showProgress: boolean,
): Transform | undefined {
  const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (!showProgress || !Number.isFinite(totalBytes) || totalBytes <= 0) {
    return undefined;
  }

  let downloadedBytes = 0;
  let lastPercent = -1;

  process.stdout.write(`\r${renderProgressBar(0, totalBytes)}`);

  return new Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      const nextPercent = Math.floor((downloadedBytes / totalBytes) * 100);

      if (nextPercent !== lastPercent) {
        process.stdout.write(`\r${renderProgressBar(downloadedBytes, totalBytes)}`);
        lastPercent = nextPercent;
      }

      callback(null, chunk);
    },
    final(callback) {
      process.stdout.write(`\r${renderProgressBar(totalBytes, totalBytes)}\n`);
      callback();
    },
  });
}
