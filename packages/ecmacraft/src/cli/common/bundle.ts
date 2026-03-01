import { build, type BuildOptions } from 'esbuild';
import { javaTypePlugin } from './java-type-plugin.js';

interface BundleSourceOptions {
  entryFile: string;
  outfile: string;
  minify: boolean;
  additionalConfig?: BuildOptions;
}

export async function bundleSource(options: BundleSourceOptions): Promise<void> {
  const { entryFile, outfile, minify, additionalConfig } = options;
  const additionalPure = additionalConfig?.pure ?? [];
  const pure = Array.from(new Set(['Java.type', ...additionalPure]));
  const additionalPlugins = additionalConfig?.plugins ?? [];

  await build({
    entryPoints: [entryFile],
    bundle: true,
    treeShaking: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile,
    sourcemap: minify ? false : 'inline',
    minifySyntax: true,
    minify,
    logLevel: 'silent',
    ...additionalConfig,
    plugins: [javaTypePlugin(), ...additionalPlugins],
    pure,
  });
}
