import { PluginContext, Event, SpigotEventType } from 'ecmacraft';

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
