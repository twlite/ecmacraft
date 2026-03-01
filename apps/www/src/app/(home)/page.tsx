import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b bg-linear-to-b from-fd-background to-fd-muted/30">
        {/* subtle centre glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-fd-border to-transparent" />
          <div className="mx-auto h-full max-w-5xl bg-linear-to-r from-transparent via-fd-muted/30 to-transparent" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:gap-14 lg:py-28">
          {/* ── Left: copy ── */}
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-fd-card/80 px-3.5 py-1 text-xs font-medium tracking-wide text-fd-muted-foreground backdrop-blur">
              TypeScript-first Minecraft plugin development
            </span>

            <h1 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Build production&#8209;grade Spigot&nbsp;plugins with a&nbsp;modern&nbsp;DX.
            </h1>

            <p className="mt-4 max-w-xl text-[0.938rem] leading-relaxed text-fd-muted-foreground sm:mt-5 sm:text-base md:text-lg">
              Write plugin logic in TypeScript, bundle with esbuild, and run through a Java host plugin powered by
              GraalVM.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
              >
                Read Documentation
              </Link>
              <Link
                href="https://github.com/twlite/ecmacraft"
                className="inline-flex items-center justify-center rounded-lg border bg-fd-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
              >
                View on GitHub
              </Link>
            </div>

            {/* Stats row */}
            <dl className="mt-8 flex flex-wrap gap-3 sm:mt-10">
              {[
                ['Language', 'TypeScript'],
                ['Runtime', 'GraalVM'],
                ['Targets', 'Paper / Spigot'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-fd-card/70 px-4 py-2.5 backdrop-blur">
                  <dt className="text-[0.6875rem] uppercase tracking-wider text-fd-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Right: code card ── */}
          <div className="w-full min-w-0 lg:max-w-md">
            <div className="overflow-hidden rounded-xl border bg-fd-card shadow-sm">
              {/* Quick start */}
              <div className="border-b bg-fd-muted/30 px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-fd-muted-foreground">
                  Quick Start
                </p>
                <pre className="mt-2.5 overflow-x-auto rounded-md border bg-fd-card px-3 py-2.5 text-[0.8125rem] leading-relaxed text-fd-foreground">
                  <code>{`$ pnpm create ecmacraft\n$ cd my-plugin\n$ pnpm dev`}</code>
                </pre>
              </div>

              {/* Example plugin */}
              <div className="px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-fd-muted-foreground">
                  Example Plugin
                </p>
                <pre className="mt-2.5 overflow-x-auto rounded-md border bg-neutral-950 px-3 py-3 text-[0.72rem] leading-[1.7] text-neutral-300 sm:text-[0.8125rem]">
                  <code>
                    <div>
                      <span className="text-purple-400">import</span> {'{'}
                    </div>
                    <div>
                      {'  '}
                      <span className="text-purple-400">type</span> <span className="text-sky-300">PluginContext</span>,
                    </div>
                    <div>
                      {'  '}
                      <span className="text-purple-400">type</span>{' '}
                      <span className="text-sky-300">SpigotEventType</span>,
                    </div>
                    <div>
                      {'  '}
                      <span className="text-sky-300">Event</span>,
                    </div>
                    <div>
                      {'}'} <span className="text-purple-400">from</span>{' '}
                      <span className="text-amber-300">&apos;ecmacraft&apos;</span>;
                    </div>
                    <div className="h-1.5" />
                    <div>
                      <span className="text-purple-400">class</span>{' '}
                      <span className="text-sky-300">LightningStriker</span> {'{'}
                    </div>
                    <div>
                      {'  '}
                      <span className="text-amber-200">@Event</span>(
                      <span className="text-amber-300">&apos;PlayerToggleSneakEvent&apos;</span>)
                    </div>
                    <div>
                      {'  '}
                      <span className="text-emerald-300">onSneak</span>(<span className="text-neutral-100">event</span>:{' '}
                      <span className="text-sky-300">SpigotEventType</span>&lt;
                      <span className="text-amber-300">&apos;PlayerToggleSneakEvent&apos;</span>&gt;) {'{'}
                    </div>
                    <div>
                      {'    '}
                      <span className="text-purple-400">if</span> (!<span className="text-neutral-100">event</span>.
                      <span className="text-emerald-300">isSneaking</span>()){' '}
                      <span className="text-purple-400">return</span>;
                    </div>
                    <div className="h-1.5" />
                    <div>
                      {'    '}
                      <span className="text-purple-400">const</span> <span className="text-neutral-100">player</span> ={' '}
                      <span className="text-neutral-100">event</span>.
                      <span className="text-emerald-300">getPlayer</span>();
                    </div>
                    <div>
                      {'    '}
                      <span className="text-neutral-100">player</span>.
                      <span className="text-emerald-300">getWorld</span>().
                      <span className="text-emerald-300">strikeLightning</span>(
                      <span className="text-neutral-100">player</span>.
                      <span className="text-emerald-300">getLocation</span>());
                    </div>
                    <div>
                      {'  '}
                      {'}'}
                    </div>
                    <div>{'}'}</div>
                    <div className="h-1.5" />
                    <div>
                      <span className="text-purple-400">export default function</span>{' '}
                      <span className="text-emerald-300">main</span>(<span className="text-neutral-100">ctx</span>:{' '}
                      <span className="text-sky-300">PluginContext</span>) {'{'}
                    </div>
                    <div>
                      {'  '}
                      <span className="text-neutral-100">ctx</span>.
                      <span className="text-emerald-300">registerHandlers</span>(
                      <span className="text-purple-400">new</span>{' '}
                      <span className="text-sky-300">LightningStriker</span>());
                    </div>
                    <div>{'}'}</div>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to ship plugins&nbsp;confidently
          </h2>
          <p className="mt-3 text-fd-muted-foreground sm:text-lg">
            A focused toolchain for strongly typed APIs, fast local iteration, and clean&nbsp;builds.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Typed Spigot API',
              desc: 'Generated event and runtime types so handlers are autocomplete-friendly and safer to refactor.',
            },
            {
              title: 'Fast CLI Workflow',
              desc: (
                <>
                  Use <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.8125rem]">ecmacraft dev</code> for live
                  bundling + server reload, and{' '}
                  <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.8125rem]">ecmacraft build</code> to produce
                  production jars.
                </>
              ),
            },
            {
              title: 'Zero-Friction Scaffolding',
              desc: (
                <>
                  Bootstrap with{' '}
                  <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.8125rem]">create-ecmacraft</code> and start
                  coding immediately with sensible defaults.
                </>
              ),
            },
          ].map((f) => (
            <article
              key={f.title}
              className="group rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent/40 sm:p-6"
            >
              <h3 className="text-base font-semibold sm:text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="border-y bg-fd-muted/20">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">From idea to running plugin in&nbsp;minutes</h2>

          <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                step: 1,
                title: 'Create a project',
                desc: 'Scaffold a new plugin with starter config, scripts, and TypeScript entrypoint.',
              },
              {
                step: 2,
                title: 'Develop in watch mode',
                desc: (
                  <>
                    Run <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.8125rem]">ecmacraft dev</code> to
                    rebuild on change and trigger server/plugin reload commands.
                  </>
                ),
              },
              {
                step: 3,
                title: 'Ship a production jar',
                desc: (
                  <>
                    Build a minified bundle and package it into{' '}
                    <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.8125rem]">dist/ecmacraft.jar</code> for
                    deployment.
                  </>
                ),
              },
            ].map((s) => (
              <article key={s.step} className="rounded-xl border bg-fd-card p-5 sm:p-6">
                <span className="inline-flex size-7 items-center justify-center rounded-full border bg-fd-muted text-xs font-bold">
                  {s.step}
                </span>
                <h3 className="mt-3 text-base font-semibold sm:text-lg">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
