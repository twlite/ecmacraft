import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ENTRY_CANDIDATES = ['main.ts', 'main.tsx', 'main.js', 'main.jsx'];

export function resolveSourceEntry(cwd: string): string {
  const srcDir = join(cwd, 'src');

  for (const candidate of ENTRY_CANDIDATES) {
    const filePath = join(srcDir, candidate);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  throw new Error(
    `Could not find an entry file. Expected one of: ${ENTRY_CANDIDATES.map((name) => `src/${name}`).join(', ')} in ${cwd}`,
  );
}
