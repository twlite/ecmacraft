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
}
