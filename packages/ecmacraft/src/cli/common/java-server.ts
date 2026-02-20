import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export interface JavaServerOptions {
  cwd: string;
  serverJarPath: string;
  javaArgs: string[];
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export function startJavaServer(options: JavaServerOptions): ChildProcessWithoutNullStreams {
  const processHandle = spawn('java', [...options.javaArgs, '-jar', options.serverJarPath, 'nogui'], {
    cwd: options.cwd,
    stdio: 'pipe',
  });

  processHandle.stdout.setEncoding('utf-8');
  processHandle.stderr.setEncoding('utf-8');

  processHandle.stdout.on('data', (chunk: string) => {
    options.onStdout?.(chunk);
  });

  processHandle.stderr.on('data', (chunk: string) => {
    options.onStderr?.(chunk);
  });

  processHandle.on('exit', (code, signal) => {
    options.onExit?.(code, signal);
  });

  return processHandle;
}

export function sendServerCommand(processHandle: ChildProcessWithoutNullStreams, command: string): void {
  if (processHandle.stdin.writable) {
    processHandle.stdin.write(`${command}\n`);
  }
}
