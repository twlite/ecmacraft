import { Autocomplete, chalk, Command } from 'ecmacraft';
import { CommandSender, JavaPlugin, Location, Material, Sound, World, World_Environment } from 'ecmacraft/spigot';

const RANDOM_LOCATION_INTERVAL = 60_000;
const MAX_ITERATIONS_FOR_TELEPORTATION = 50;
const VALID_SUBCOMMANDS = ['on', 'off'] as const;

export class RandomLocation {
  private isEnabled = false;
  private randomLocationTimer: NodeJS.Timeout | null = null;

  public constructor(private plugin: JavaPlugin) {}

  @Command('randomlocation')
  public handleRandomLocation(sender: CommandSender, args: string[], label: string) {
    if (!sender.isOp()) {
      return false;
    }

    const subcommand = args[0]?.toLowerCase();

    if (!VALID_SUBCOMMANDS.includes(subcommand as (typeof VALID_SUBCOMMANDS)[number])) {
      sender.sendMessage(chalk.red`Invalid subcommand! Usage: /${label} <on|off>`);
      return false;
    }

    const shouldEnable = subcommand === 'on';

    if (shouldEnable === this.isEnabled) {
      sender.sendMessage(chalk.yellow`Random location is already ${shouldEnable ? 'enabled' : 'disabled'}!`);
      return true;
    }

    if ((this.isEnabled = shouldEnable)) {
      sender.sendMessage(
        chalk.green`Random location enabled! Players will be teleported every ${RANDOM_LOCATION_INTERVAL / 1000} seconds.`,
      );

      this.createTimer();

      return true;
    } else {
      this.destroy();
      sender.sendMessage(chalk.yellow`Random location disabled! Players will no longer be teleported.`);
      return true;
    }
  }

  @Autocomplete('randomlocation')
  public handleRandomLocationAutocomplete(sender: CommandSender, args: string[]) {
    if (!sender.isOp()) return [];

    const lastArg = args[args.length - 1] ?? '';

    return VALID_SUBCOMMANDS.filter((option) => option.startsWith(String(lastArg).toLowerCase()));
  }

  private randomLocation(world: World, center: number): number {
    const isNether = world.getEnvironment() === World_Environment.NETHER;
    const isEnd = world.getEnvironment() === World_Environment.THE_END;

    const radius = isNether ? 20 : isEnd ? 30 : 100;
    return Math.round(center + Math.floor(Math.random() * radius * 2) - radius);
  }

  private isUnsafeGround(material: Material): boolean {
    switch (material) {
      case Material.LAVA:
      case Material.VOID_AIR:
        return true;
      default:
        return false;
    }
  }

  private isStandableGround(material: Material, isPassable: boolean): boolean {
    if (this.isUnsafeGround(material)) return false;

    // Prevent selecting air/cave-air-like blocks as "ground".
    return !isPassable;
  }

  private findOptimalDestination(location: Location) {
    const world = location.getWorld();
    const x = this.randomLocation(world, location.getX());
    const z = this.randomLocation(world, location.getZ());
    const isNether = world.getEnvironment() === World_Environment.NETHER;
    const maxY = world.getMaxHeight() - 2;
    const minY = world.getMinHeight() + 1;
    const highestY = world.getHighestBlockYAt(x, z);

    // In the Nether, start below the bedrock ceiling to avoid roof teleports.
    const startY = Math.min(highestY, isNether ? maxY - 4 : maxY);

    for (let y = startY; y >= minY; y--) {
      const groundBlock = world.getBlockAt(x, y, z);
      const feetBlock = world.getBlockAt(x, y + 1, z);
      const headBlock = world.getBlockAt(x, y + 2, z);
      const groundType = groundBlock.getType();
      const feetType = feetBlock.getType();
      const headType = headBlock.getType();

      // Keep players below the Nether bedrock ceiling.
      if (isNether && groundType === Material.BEDROCK && y >= highestY - 2) continue;

      if (!this.isStandableGround(groundType, groundBlock.isPassable())) continue;
      if (this.isUnsafeGround(feetType) || this.isUnsafeGround(headType)) continue;
      if (!feetBlock.isPassable() || !headBlock.isPassable()) continue;

      location.setX(x);
      location.setY(y + 1);
      location.setZ(z);

      return location;
    }

    return null;
  }

  private createTimer() {
    if (!this.isEnabled) return;

    this.destroy();
    this.randomLocationTimer = setInterval(() => {
      if (!this.isEnabled) return this.destroy();

      const server = this.plugin.getServer();
      const players = server.getOnlinePlayers();

      if (players.length < 1) return;

      server.broadcastMessage(chalk.red`Teleporting ${players.length} player(s)!`);

      for (const player of players) {
        const location = player.getLocation();

        let optimalLocation: Location | null = null;
        let maxIter = MAX_ITERATIONS_FOR_TELEPORTATION;

        while (optimalLocation === null && maxIter-- > 0) {
          optimalLocation = this.findOptimalDestination(location);

          if (!optimalLocation) {
            player.sendMessage(
              chalk.yellow`Failed to find a safe location, retrying... (${MAX_ITERATIONS_FOR_TELEPORTATION - maxIter}/${MAX_ITERATIONS_FOR_TELEPORTATION})`,
            );
          }
        }

        if (!optimalLocation) {
          player.sendMessage(chalk.red`Failed to find a safe location for teleportation, you are safe this round!`);
          continue;
        }

        player.teleport(optimalLocation);
        player.playSound(optimalLocation, Sound.ENTITY_ENDERMAN_TELEPORT, 1, 1);

        player.sendMessage(
          chalk.yellow`You have been teleported to ${chalk.green`${optimalLocation.getX()}, ${optimalLocation.getY()}, ${optimalLocation.getZ()}`}!`,
        );
      }
    }, RANDOM_LOCATION_INTERVAL);
  }

  public destroy() {
    if (this.randomLocationTimer) {
      clearInterval(this.randomLocationTimer);
      this.randomLocationTimer = null;
    }
  }
}
