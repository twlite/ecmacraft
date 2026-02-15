# EcmaCraft

EcmaCraft is a polyglot Minecraft plugin platform that lets you author Spigot plugin logic in TypeScript, while running through a Java host plugin powered by GraalVM JavaScript.

The repository is a monorepo that contains:

- a Java plugin runtime (`ecmacraft/`) loaded by Spigot/Paper,
- TypeScript packages for decorators and generated Spigot typings,
- a development plugin bundle (`packages/dev-plugin`) that is executed inside the Java runtime,
- a documentation site (`apps/www`) built with Next.js.

## Why EcmaCraft

Traditional plugin development is Java-first. EcmaCraft provides a TypeScript-first workflow with:

- Type-safe event signatures generated from Spigot API,
- decorator-based handler registration (`@Event`, `@Command`),
- Java host/plugin compatibility with standard Spigot deployment.

### Example TypeScript Plugin

This simple plugin strikes lightning at the player's location whenever they start sneaking:

```ts
import { PluginContext, Event, SpigotEventType } from '@ecmacraft/types';

class LightningStriker {
  @Event('PlayerToggleSneakEvent')
  public onPlayerToggleSneak(event: SpigotEventType<'PlayerToggleSneakEvent'>) {
    if (!event.isSneaking()) return;

    const player = event.getPlayer();
    const location = player.getLocation();

    location.getWorld().strikeLightning(location);
  }
}

export default function main(ctx: PluginContext) {
  ctx.registerHandlers(new LightningStriker());
}
```

## Architecture

1. The Java plugin (`ecmacraft`) starts on server boot.
2. It creates a GraalVM JS context and loads `plugins/ecmacraft/main.js`.
3. The JS module default export receives a `PluginContext`.
4. TypeScript handlers are registered via `ctx.registerHandlers(...)`.
5. Decorator metadata maps JS methods to Spigot events/commands.

## Repository Layout

- `ecmacraft/` — Java plugin host (Maven project, shaded jar)
- `packages/types/` — runtime decorators and generated Spigot TypeScript definitions
- `packages/dev-plugin/` — example/development TypeScript plugin bundle
- `apps/www/` — project docs site (Next.js + Fumadocs)
- `scripts/` — generation and server prep scripts
- `test-server/` — local Minecraft server environment for integration testing

## Prerequisites

- Node.js `>= 18`
- `pnpm` (workspace package manager)
- Java `21`
- A Spigot/Paper-compatible test server jar in `test-server/`

## Getting Started

Install dependencies:

```bash
pnpm install
```

Build all workspace packages/apps:

```bash
pnpm build
```

Build the Java host plugin jar:

```bash
pnpm build:plugin
```

Build generated TypeScript runtime/types (if needed after API updates):

```bash
pnpm --filter @ecmacraft/types build
```

Build the development plugin bundle:

```bash
pnpm --filter @ecmacraft/dev-plugin build
```

## Run the Local Test Server

```bash
pnpm test-server
```

`test-server` runs a pre-start copy step (`scripts/pre-server.ts`) that:

- copies the Java plugin jar to `test-server/plugins/ecmacraft.jar`,
- copies the TypeScript bundle to `test-server/plugins/ecmacraft/main.js`.

This gives a tight edit → build → run loop for plugin iteration.

## Common Scripts

From repository root:

- `pnpm build` — run `turbo` build pipeline
- `pnpm dev` — run development tasks across workspace
- `pnpm lint` — lint workspace packages/apps
- `pnpm check-types` — run type checks
- `pnpm format` — format TS/TSX/MD files
- `pnpm build:plugin` — package Java plugin via Maven
- `pnpm test-server` — prepare and launch local server

## Type Generation Workflow

Spigot typings can be regenerated from a server API jar:

```bash
pnpm generate-dts
```

This updates generated files in `packages/types/src` and extracts event names for decorator typing.

## Documentation Site

The docs app is located in `apps/www`.

Start it from the root with your workspace dev pipeline, or run the app directly via filter:

```bash
pnpm --filter www dev
```

## License

MIT — see [LICENSE](LICENSE).
