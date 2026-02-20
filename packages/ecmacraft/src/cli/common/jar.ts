import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import JSZip from 'jszip';

interface InjectIntoJarOptions {
  inputJarPath: string;
  outputJarPath: string;
  internalPath: string;
  content: string;
}

export async function injectTextFileIntoJar(options: InjectIntoJarOptions): Promise<void> {
  const { inputJarPath, outputJarPath, internalPath, content } = options;
  const buffer = await readFile(inputJarPath);
  const zip = await JSZip.loadAsync(buffer);

  zip.file(internalPath, content);

  const outputBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  await mkdir(dirname(outputJarPath), { recursive: true });
  await writeFile(outputJarPath, outputBuffer);
}
