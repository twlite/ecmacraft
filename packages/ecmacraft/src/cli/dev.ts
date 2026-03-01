import { watch } from 'chokidar';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { extname, join } from 'node:path';
import { setupDevServerDirectory } from './common/dev-server-setup.js';
import { loadEcmacraftConfig } from './common/config.js';
import { resolveSourceEntry } from './common/entry.js';
import { bundleSource } from './common/bundle.js';
import { sendServerCommand, startJavaServer } from './common/java-server.js';
import { ReloadType } from '../config/types.js';

const WATCHABLE_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx']);

interface PrepareDevelopmentEnvironmentOptions {
  cwd: string;
}

function resolveReloadCommand(reloadType: ReloadType): string | null {
  return reloadType === 'hard' ? 'reload confirm' : reloadType === 'soft' ? 'ecmacraft-reload' : null;
}

export async function prepareDevelopmentEnvironment(opts: PrepareDevelopmentEnvironmentOptions) {
  const cwd = opts.cwd;
  const config = await loadEcmacraftConfig(cwd);
  const entryFile = resolveSourceEntry(cwd);
  const paths = await setupDevServerDirectory(cwd, config);

  console.log(`[ecmacraft] Using working directory: ${cwd}`);
  console.log(`[ecmacraft] Bundling from entry: ${entryFile}`);

  await bundleSource({
    entryFile,
    outfile: paths.bundledJsPath,
    minify: false,
    additionalConfig: config.development.esbuildConfig,
  });

  console.log('[ecmacraft] Initial bundle complete');
  console.log('[ecmacraft] Starting PaperMC server process...');

  const reloadCommand = resolveReloadCommand(config.development.reloadType);
  let shuttingDown = false;
  let disposed = false;
  let serverProcess: ChildProcessWithoutNullStreams;
  let jvmFatalDetected = false;
  let restartAttempts = 0;

  const handleStdinData = (chunk: string | Buffer) => {
    if (!serverProcess?.stdin.writable) {
      return;
    }

    serverProcess.stdin.write(chunk);
  };

  const launchServer = () => {
    serverProcess = startJavaServer({
      cwd: paths.rootDir,
      serverJarPath: paths.serverJarPath,
      javaArgs: config.development.javaArgs,
      onStdout: (data) => process.stdout.write(`[paper] ${data}`),
      onStderr: (data) => {
        process.stderr.write(`[paper] ${data}`);
        if (data.includes('A fatal error has been detected by the Java Runtime Environment')) {
          jvmFatalDetected = true;
        }
      },
      onExit: (code, signal) => {
        if (shuttingDown) {
          return;
        }

        const status = signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`;

        if (!jvmFatalDetected && restartAttempts < 2) {
          restartAttempts += 1;
          console.error(
            `[ecmacraft] PaperMC process exited unexpectedly (${status}). Restarting (${restartAttempts}/2)...`,
          );
          launchServer();
          return;
        }

        console.error(`[ecmacraft] PaperMC process exited unexpectedly (${status}).`);
        if (jvmFatalDetected) {
          console.error('[ecmacraft] Fatal JVM crash detected; stopping dev server.');
        }

        process.exitCode = 1;
        process.exit(1);
      },
    });
  };

  launchServer();

  const sourceDir = join(cwd, 'src');

  const watcher = watch(sourceDir, {
    ignoreInitial: true,
    ignored: (watchedPath, stats) => (stats?.isFile() ? !WATCHABLE_EXTENSIONS.has(extname(watchedPath)) : false),
  });

  let isBuilding = false;
  let buildQueued = false;

  const runBuild = async () => {
    if (isBuilding) {
      buildQueued = true;
      return;
    }

    isBuilding = true;
    try {
      await bundleSource({
        entryFile,
        outfile: paths.bundledJsPath,
        minify: false,
        additionalConfig: config.development.esbuildConfig,
      });

      if (reloadCommand) {
        console.log(`[ecmacraft] Bundle succeeded, running: ${reloadCommand}`);
        sendServerCommand(serverProcess, reloadCommand);
      }
    } catch (error) {
      console.error('[ecmacraft] Bundle failed (watch loop continues):');
      console.error(error);
    } finally {
      isBuilding = false;
      if (buildQueued) {
        buildQueued = false;
        await runBuild();
      }
    }
  };

  watcher.on('ready', () => {
    console.log(`[ecmacraft] Watching ${sourceDir} for changes...`);
  });

  watcher.on('all', (eventName, watchedPath) => {
    if (eventName !== 'add' && eventName !== 'change' && eventName !== 'unlink') {
      return;
    }

    console.log(`[ecmacraft] Source ${eventName}: ${watchedPath}`);
    void runBuild();
  });

  watcher.on('error', (error) => {
    console.error('[ecmacraft] Watcher error (watch loop continues):');
    console.error(error);
  });

  process.stdin.on('data', handleStdinData);
  process.stdin.resume();
  console.log('[ecmacraft] Type server commands directly in this terminal.');

  const SHUTDOWN_TIMEOUT_MS = 15_000;

  const dispose = async () => {
    if (disposed) {
      return;
    }

    disposed = true;
    shuttingDown = true;
    process.stdin.off('data', handleStdinData);
    process.stdin.pause();
    await watcher.close();

    try {
      sendServerCommand(serverProcess, 'stop');
      serverProcess.stdin.end();
    } catch {
      // no-op
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[ecmacraft] Server did not exit in time, killing process...');
        serverProcess.kill('SIGKILL');
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);

      serverProcess.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  process.on('SIGINT', () => {
    void dispose().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void dispose().then(() => process.exit(0));
  });

  await new Promise<void>((resolve) => {
    serverProcess.once('exit', () => {
      resolve();
    });
  });
}
