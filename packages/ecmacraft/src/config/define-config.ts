import { DeepPartial } from '../common/types.js';
import type { EcmacraftConfig } from './types.js';

export function defineConfig(config: DeepPartial<EcmacraftConfig>): EcmacraftConfig {
  return config as EcmacraftConfig;
}
