import Link from 'next/link';

const IMPORT_NAMES = `{
  type PluginContext,
  type SpigotEventType
  Event,
}`;

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b bg-linear-to-b from-fd-background via-fd-background to-fd-muted/40">
        <div className="pointer-events-none absolute inset-0">
          <div className="mx-auto h-full max-w-6xl bg-linear-to-r from-transparent via-fd-muted/40 to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-24 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="inline-flex items-center rounded-full border bg-fd-card px-4 py-1.5 text-sm font-medium text-fd-muted-foreground">
              TypeScript-first Minecraft plugin development
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Build production-grade Paper and Spigot plugins with a modern DX.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-fd-muted-foreground">
              EcmaCraft lets you write plugin logic in TypeScript, bundle with esbuild, and run through a Java host
              plugin powered by GraalVM.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/docs"
                className="rounded-lg bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
              >
                Read Documentation
              </Link>
              <Link
                href="https://github.com/twlite/ecmacraft"
                className="rounded-lg border bg-fd-card px-5 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
              >
                View on GitHub
              </Link>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              <div className="rounded-lg border bg-fd-card px-4 py-3">
                <dt className="text-xs text-fd-muted-foreground">Language</dt>
                <dd className="mt-1 text-sm font-semibold">TypeScript</dd>
              </div>
              <div className="rounded-lg border bg-fd-card px-4 py-3">
                <dt className="text-xs text-fd-muted-foreground">Runtime</dt>
                <dd className="mt-1 text-sm font-semibold">GraalVM</dd>
              </div>
              <div className="rounded-lg border bg-fd-card px-4 py-3">
                <dt className="text-xs text-fd-muted-foreground">Targets</dt>
                <dd className="mt-1 text-sm font-semibold">Paper/Spigot</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border bg-fd-card p-4 shadow-sm">
            <div className="rounded-xl border bg-fd-muted/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">Quick Start</p>
              <pre className="mt-3 overflow-x-auto rounded-lg border bg-fd-card p-4 text-sm text-fd-foreground">
                <code>{`$ pnpm create ecmacraft\n$ cd my-plugin\n$ pnpm dev`}</code>
              </pre>
            </div>
            <div className="mt-4 rounded-xl border bg-fd-background p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">Example Plugin</p>
              <pre className="mt-3 overflow-x-auto rounded-lg border bg-fd-card p-4 text-xs leading-6 sm:text-sm">
                <code>
                  <div>
                    <span className="text-fd-primary">import</span> {IMPORT_NAMES}{' '}
                    <span className="text-fd-primary">from</span>{' '}
                    <span className="text-fd-muted-foreground">'ecmacraft'</span>;
                  </div>
                  <div className="h-2" />
                  <div>
                    <span className="text-fd-primary">class</span> LightningStriker {'{'}
                  </div>
                  <div>
                    {'  '}
                    <span className="text-fd-primary">@Event</span>
                    <span className="text-fd-muted-foreground">('PlayerToggleSneakEvent')</span>
                  </div>
                  <div>
                    {'  '}onSneak(event: SpigotEventType&lt;'PlayerToggleSneakEvent'&gt;) {'{'}
                  </div>
                  <div>
                    {'    '}
                    <span className="text-fd-primary">if</span> (!event.isSneaking()){' '}
                    <span className="text-fd-primary">return</span>;
                  </div>
                  <div className="h-2" />
                  <div>
                    {'    '}
                    <span className="text-fd-primary">const</span> player = event.getPlayer();
                  </div>
                  <div>{'    '}player.getWorld().strikeLightning(player.getLocation());</div>
                  <div>
                    {'  '}
                    {'}'}
                  </div>
                  <div>{'}'}</div>
                  <div className="h-2" />
                  <div>
                    <span className="text-fd-primary">export default function</span> main(ctx: PluginContext) {'{'}
                  </div>
                  <div>
                    {'  '}ctx.registerHandlers(<span className="text-fd-primary">new</span> LightningStriker());
                  </div>
                  <div>{'}'}</div>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight">Everything you need to ship plugins confidently</h2>
          <p className="mt-3 text-fd-muted-foreground">
            A focused toolchain for strongly typed APIs, fast local iteration, and clean builds.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <article className="rounded-xl border bg-fd-card p-6 transition-colors hover:bg-fd-accent/50">
            <h3 className="text-lg font-semibold">Typed Spigot API</h3>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              Work with generated event and runtime types so handlers are autocomplete-friendly and safer to refactor.
            </p>
          </article>
          <article className="rounded-xl border bg-fd-card p-6 transition-colors hover:bg-fd-accent/50">
            <h3 className="text-lg font-semibold">Fast CLI Workflow</h3>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              Use ecmacraft dev for live bundling + server reload, and ecmacraft build to produce production jars.
            </p>
          </article>
          <article className="rounded-xl border bg-fd-card p-6 transition-colors hover:bg-fd-accent/50">
            <h3 className="text-lg font-semibold">Zero-Friction Scaffolding</h3>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              Bootstrap a plugin project with create-ecmacraft and start coding immediately with sensible defaults.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y bg-fd-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">From idea to running plugin in minutes</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <article className="rounded-xl border bg-fd-card p-6">
              <p className="text-sm font-medium text-fd-muted-foreground">Step 1</p>
              <h3 className="mt-2 text-lg font-semibold">Create a project</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Scaffold a new plugin with starter config, scripts, and TypeScript entrypoint.
              </p>
            </article>
            <article className="rounded-xl border bg-fd-card p-6">
              <p className="text-sm font-medium text-fd-muted-foreground">Step 2</p>
              <h3 className="mt-2 text-lg font-semibold">Develop in watch mode</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Run ecmacraft dev to rebuild on change and trigger server/plugin reload commands.
              </p>
            </article>
            <article className="rounded-xl border bg-fd-card p-6">
              <p className="text-sm font-medium text-fd-muted-foreground">Step 3</p>
              <h3 className="mt-2 text-lg font-semibold">Ship a production jar</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Build a minified bundle and package it into dist/ecmacraft.jar for deployment.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
