import { chalk, Event, SpigotEventType } from 'ecmacraft';

export class DeathLocation {
  @Event('PlayerDeathEvent')
  public onPlayerDeath(event: SpigotEventType<'PlayerDeathEvent'>) {
    const player = event.getEntity();
    const location = player.getLocation();
    const worldName = location.getWorld().getName();
    const x = location.getX();
    const y = location.getY();
    const z = location.getZ();

    player.sendMessage(chalk.red`You died at ${chalk.yellow`${x}, ${y}, ${z}`} in world ${chalk.green(worldName)}!`);
  }
}
