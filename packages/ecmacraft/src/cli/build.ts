import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { bundleSource } from './common/bundle.js';
import { loadEcmacraftConfig } from './common/config.js';
import { downloadEcmacraft } from './common/ecmacraft.js';
import { resolveSourceEntry } from './common/entry.js';
import { injectTextFileIntoJar } from './common/jar.js';
import { createBinDir, EMBEDDED_JS_PATH } from './common/paths.js';

interface BuildProductionArtifactOptions {
  cwd: string;
}

export async function buildProductionArtifact(options: BuildProductionArtifactOptions): Promise<void> {
  const cwd = options.cwd;
  const config = await loadEcmacraftConfig(cwd);
  const entryFile = resolveSourceEntry(cwd);

  const tempDir = await mkdtemp(join(tmpdir(), 'ecmacraft-build-'));
  const tempMainJsPath = join(tempDir, 'main.js');
  const tempJarPath = join(tempDir, 'ecmacraft.jar');
  const outputDir = join(cwd, 'dist');
  const outputJarPath = join(outputDir, 'ecmacraft.jar');
  const cacheDir = createBinDir(cwd);

  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  console.log(`[ecmacraft] Using working directory: ${cwd}`);
  console.log(`[ecmacraft] Bundling from entry: ${entryFile}`);

  try {
    await bundleSource({
      entryFile,
      outfile: tempMainJsPath,
      minify: true,
      additionalConfig: config.production.esbuildConfig,
    });

    await downloadEcmacraft({
      filePath: tempJarPath,
      showProgress: true,
      cacheDir,
    });

    const bundledCode = await readFile(tempMainJsPath, 'utf-8');
    await mkdir(outputDir, { recursive: true });

    await writeFile(join(outputDir, 'main.js'), bundledCode, 'utf-8');

    await injectTextFileIntoJar({
      inputJarPath: tempJarPath,
      outputJarPath,
      internalPath: EMBEDDED_JS_PATH,
      content: bundledCode,
    });

    console.log(`[ecmacraft] Production artifact created: ${outputJarPath}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
