import { join } from 'node:path';

export const DEV_ROOT_RELATIVE_PATH = '.ecmacraft/development';
export const BUNDLED_JS_FILENAME = 'main.js';
export const EMBEDDED_JS_PATH = 'assets/ecmacraft/main.js';

export interface DevelopmentPaths {
  cwd: string;
  rootDir: string;
  serverJarPath: string;
  eulaPath: string;
  pluginsDir: string;
  ecmacraftJarPath: string;
  ecmacraftDataDir: string;
  bundledJsPath: string;
}

export function createDevelopmentPaths(cwd: string): DevelopmentPaths {
  const rootDir = join(cwd, DEV_ROOT_RELATIVE_PATH);
  const pluginsDir = join(rootDir, 'plugins');
  const ecmacraftDataDir = join(pluginsDir, 'ecmacraft');

  return {
    cwd,
    rootDir,
    serverJarPath: join(rootDir, 'server.jar'),
    eulaPath: join(rootDir, 'eula.txt'),
    pluginsDir,
    ecmacraftJarPath: join(pluginsDir, 'ecmacraft.jar'),
    ecmacraftDataDir,
    bundledJsPath: join(ecmacraftDataDir, BUNDLED_JS_FILENAME),
  };
}
