import { Event, SpigotEventType } from '@ecmacraft/types';

export class LightningStriker {
  @Event('PlayerToggleSneakEvent')
  public onPlayerToggleSneak(event: SpigotEventType<'PlayerToggleSneakEvent'>) {
    if (!event.isSneaking()) return;

    const player = event.getPlayer();
    const location = player.getLocation();

    location.getWorld().strikeLightning(location);
  }
}
