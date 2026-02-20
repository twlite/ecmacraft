import { type PluginContext, Event, type SpigotEventType } from 'ecmacraft';

class Welcomer {
  @Event('PlayerJoinEvent')
  onPlayerJoin(event: SpigotEventType<'PlayerJoinEvent'>) {
    const player = event.getPlayer();

    player.sendMessage('Welcome to the server!');
  }
}

export default function main(ctx: PluginContext) {
  ctx.registerHandlers(new Welcomer());
}
