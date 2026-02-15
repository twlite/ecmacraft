import { PluginContext } from '@ecmacraft/types';
import { LightningStriker } from './lightning-striker.js';

export default function main(ctx: PluginContext) {
  ctx.registerHandlers(new LightningStriker());
}
