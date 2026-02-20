# EcmaCraft

EcmaCraft is a tool for building Minecraft plugins using JavaScript or TypeScript. It provides a simple and efficient development experience, allowing you to write plugins in a modern language while still targeting the Minecraft plugin ecosystem.

## Installation

You can install EcmaCraft globally using npm:

```bash
npm install ecmacraft
```

## Usage

This is a simple ecmacraft plugin that strikes lightning when a player sneaks. You can use this as a starting point for your own plugin development.

```ts
// src/main.ts
import { type PluginContext, Event, type SpigotEventType } from 'ecmacraft';

class LightningStriker {
  @Event('PlayerToggleSneakEvent')
  onBlockBreak(event: SpigotEventType<'PlayerToggleSneakEvent'>) {
    if (!event.isSneaking()) return;

    const player = event.getPlayer();
    player.getWorld().strikeLightning(player.getLocation());
  }
}

export default function main(ctx: PluginContext) {
  ctx.registerHandlers(new LightningStriker());
}
```
