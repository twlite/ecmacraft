import type { JavaPlugin } from './jar_types.js';

export interface PluginContext {
  /**
   * Registers an event or command handler. Handler methods should be decorated with `@Event` or `@Command` for it to work.
   * @param handlers One or more handler objects.
   * @example
   * export default function main(ctx: PluginContext) {
   *   ctx.registerHandlers(new MyEventHandler(), new MyCommandHandler());
   * }
   */
  registerHandlers(...handlers: Record<any, any>[]): void;
  /**
   * Returns the `JavaPlugin` instance.
   * @example
   * export default function main(ctx: PluginContext) {
   *   const plugin = ctx.getPlugin();
   *   const server = plugin.getServer();
   *   server.broadcastMessage("Hello, world!");
   * }
   */
  getPlugin(): JavaPlugin;
}
