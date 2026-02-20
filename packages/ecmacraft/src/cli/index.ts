/**
 * Initializes the CLI application by setting up commands and their respective handlers.
 * @param args  Optional array of command-line arguments to parse. If not provided, it defaults to process.argv.
 * @returns A promise that resolves when the CLI is fully set up and ready to handle commands.
 */
export async function bootstrapCLI(args?: string[]): Promise<void> {
  const { program } = await import('commander');
  const { resolve } = await import('node:path');

  program.name('ecmacraft');

  program
    .command('dev')
    .description('Start the development server')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .action(async (opts: { cwd: string }) => {
      const { prepareDevelopmentEnvironment } = await import('./dev.js');
      await prepareDevelopmentEnvironment({
        cwd: resolve(process.cwd(), opts.cwd ?? '.'),
      });
    });

  program
    .command('build')
    .description('Build a production ecmacraft.jar artifact')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .action(async (opts: { cwd: string }) => {
      const { buildProductionArtifact } = await import('./build.js');
      await buildProductionArtifact({
        cwd: resolve(process.cwd(), opts.cwd ?? '.'),
      });
    });

  if (args) {
    await program.parseAsync(args, { from: 'user' });
  } else {
    await program.parseAsync(process.argv);
  }
}
