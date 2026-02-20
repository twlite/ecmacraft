import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { cwd, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

type CliOptions = {
  name?: string;
  dir?: string;
  description?: string;
  packageManager?: PackageManager;
  install?: boolean;
  yes?: boolean;
  overwrite?: boolean;
};

const DEFAULT_NAME = 'my-ecmacraft-plugin';
const DEFAULT_DESCRIPTION = 'A Minecraft plugin powered by ecmacraft';
const DEFAULT_PACKAGE_MANAGER: PackageManager = 'pnpm';

function parseArgs(rawArgs: string[]): CliOptions {
  const options: CliOptions = {};
  const positionals: string[] = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];

    if (!token.startsWith('-')) {
      positionals.push(token);
      continue;
    }

    const [flag, inlineValue] = token.split('=', 2);

    const readValue = () => {
      if (inlineValue !== undefined) {
        return inlineValue;
      }
      const value = rawArgs[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`Missing value for ${flag}`);
      }
      index += 1;
      return value;
    };

    switch (flag) {
      case '--name':
      case '-n':
        options.name = readValue();
        break;
      case '--dir':
      case '-d':
        options.dir = readValue();
        break;
      case '--description':
      case '--desc':
        options.description = readValue();
        break;
      case '--package-manager':
      case '--pm': {
        const value = readValue();
        if (value === 'pnpm' || value === 'npm' || value === 'yarn' || value === 'bun') {
          options.packageManager = value;
          break;
        }
        throw new Error(`Unsupported package manager: ${value}`);
      }
      case '--install':
        options.install = true;
        break;
      case '--no-install':
        options.install = false;
        break;
      case '--yes':
      case '-y':
        options.yes = true;
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        exit(0);
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  if (!options.name && positionals.length > 0) {
    options.name = positionals[0];
  }

  return options;
}

function printHelp(): void {
  console.log(
    `\ncreate-ecmacraft\n\nUsage:\n  create-ecmacraft [project-name] [options]\n\nOptions:\n  -n, --name <name>           Project/package name\n  -d, --dir <dir>             Target directory (default: project name)\n      --description <text>    Package description\n      --pm, --package-manager Package manager: pnpm | npm | yarn | bun\n      --install               Install dependencies\n      --no-install            Skip dependency installation\n      --overwrite             Allow generating into non-empty directory\n  -y, --yes                   Skip prompts and use defaults\n  -h, --help                  Show this help\n`,
  );
}

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await stat(pathname);
    return true;
  } catch {
    return false;
  }
}

async function isDirectoryEmpty(pathname: string): Promise<boolean> {
  const entries = await readdir(pathname);
  return entries.length === 0;
}

async function promptWithDefault(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string,
): Promise<string> {
  const answer = await rl.question(`${label} (${defaultValue}): `);
  const trimmed = answer.trim();
  return trimmed.length > 0 ? trimmed : defaultValue;
}

async function promptYesNo(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultYes: boolean,
): Promise<boolean> {
  const suffix = defaultYes ? 'Y/n' : 'y/N';
  const answer = (await rl.question(`${label} (${suffix}): `)).trim().toLowerCase();

  if (answer.length === 0) {
    return defaultYes;
  }

  return answer === 'y' || answer === 'yes';
}

async function installDependencies(pm: PackageManager, targetDir: string): Promise<void> {
  const argsByPm: Record<PackageManager, string[]> = {
    pnpm: ['install'],
    npm: ['install'],
    yarn: [],
    bun: ['install'],
  };

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(pm, argsByPm[pm], {
      cwd: targetDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`Dependency installation failed with exit code ${code ?? 1}`));
      }
    });
  });
}

async function updateTemplatePackageJson(projectDir: string, name: string, description: string): Promise<void> {
  const packageJsonPath = resolve(projectDir, 'package.json');
  const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonRaw) as Record<string, unknown>;
  packageJson.name = name;
  packageJson.description = description;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

export async function createEcmacraft(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(rawArgs);
  const interactive = !options.yes;

  const rl = interactive
    ? createInterface({
        input: process.stdin,
        output: process.stdout,
      })
    : undefined;

  try {
    const name =
      options.name ?? (interactive && rl ? await promptWithDefault(rl, 'Project name', DEFAULT_NAME) : DEFAULT_NAME);

    const targetDirInput =
      options.dir ?? (interactive && rl ? await promptWithDefault(rl, 'Target directory', name) : name);

    const description =
      options.description ??
      (interactive && rl ? await promptWithDefault(rl, 'Description', DEFAULT_DESCRIPTION) : DEFAULT_DESCRIPTION);

    const packageManager =
      options.packageManager ??
      (interactive && rl
        ? ((await promptWithDefault(rl, 'Package manager', DEFAULT_PACKAGE_MANAGER)) as PackageManager)
        : DEFAULT_PACKAGE_MANAGER);

    if (
      packageManager !== 'pnpm' &&
      packageManager !== 'npm' &&
      packageManager !== 'yarn' &&
      packageManager !== 'bun'
    ) {
      throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    const install =
      options.install ?? (interactive && rl ? await promptYesNo(rl, 'Install dependencies now', true) : true);

    const projectDir = resolve(cwd(), targetDirInput);
    const exists = await pathExists(projectDir);

    if (exists) {
      const empty = await isDirectoryEmpty(projectDir);

      if (!empty && !options.overwrite) {
        if (!interactive || !rl) {
          throw new Error(`Directory ${projectDir} is not empty. Use --overwrite to continue or choose another --dir.`);
        }

        const confirm = await promptYesNo(rl, 'Target directory is not empty. Continue anyway', false);
        if (!confirm) {
          console.log('Cancelled.');
          return;
        }
      }
    } else {
      await mkdir(projectDir, { recursive: true });
    }

    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    const templateDir = resolve(currentDir, '../template');

    await cp(templateDir, projectDir, {
      recursive: true,
      force: true,
    });

    await updateTemplatePackageJson(projectDir, name, description);

    if (install) {
      console.log(`Installing dependencies using ${packageManager}...`);
      await installDependencies(packageManager, projectDir);
    }

    console.log('\nProject created successfully.');
    console.log(
      `\nNext steps:\n  cd ${targetDirInput}\n  ${packageManager === 'npm' ? 'npm run dev' : `${packageManager} dev`}\n`,
    );
  } finally {
    rl?.close();
  }
}
