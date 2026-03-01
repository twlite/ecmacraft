import { PluginContext, UnloadFunction } from 'ecmacraft';
import { RandomLocation } from './random-location.js';
import { DeathLocation } from './death-location.js';

export default function main(ctx: PluginContext): UnloadFunction {
  console.log('[dev-plugin] Plugin initialized');

  const randomLocation = new RandomLocation(ctx.getPlugin());

  ctx.registerHandlers(randomLocation, new DeathLocation());

  return () => {
    randomLocation.destroy();
    console.log('[dev-plugin] Plugin shutdown');
  };
}
