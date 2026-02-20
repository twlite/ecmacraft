import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import type { DeepPartial } from '../../common/types.js';
import type { EcmacraftConfig, ServerProperties } from '../../config/types.js';

const CONFIG_FILES = [
  'ecmacraft.config.mjs',
  'ecmacraft.config.js',
  'ecmacraft.config.cjs',
  'ecmacraft.config.mts',
  'ecmacraft.config.ts',
  'ecmacraft.config.cts',
];

const DEFAULT_SERVER_PROPERTIES: ServerProperties = {
  'accepts-transfers': false,
  'allow-flight': false,
  'broadcast-console-to-ops': true,
  'broadcast-rcon-to-ops': true,
  'bug-report-link': '',
  debug: false,
  difficulty: 'easy',
  'enable-code-of-conduct': false,
  'enable-jmx-monitoring': false,
  'enable-query': false,
  'enable-rcon': false,
  'enable-status': true,
  'enforce-secure-profile': true,
  'enforce-whitelist': false,
  'entity-broadcast-range-percentage': 100,
  'force-gamemode': false,
  'function-permission-level': 2,
  gamemode: 'survival',
  'generate-structures': true,
  'generator-settings': '{}',
  hardcore: false,
  'hide-online-players': false,
  'initial-disabled-packs': '',
  'initial-enabled-packs': 'vanilla',
  'level-name': 'world',
  'level-seed': '',
  'level-type': 'minecraft:normal',
  'log-ips': true,
  'management-server-allowed-origins': '',
  'management-server-enabled': false,
  'management-server-host': 'localhost',
  'management-server-port': 0,
  'management-server-secret': '',
  'management-server-tls-enabled': true,
  'management-server-tls-keystore': '',
  'management-server-tls-keystore-password': '',
  'max-chained-neighbor-updates': 1000000,
  'max-players': 20,
  'max-tick-time': 60000,
  'max-world-size': 29999984,
  motd: 'A Minecraft Server',
  'network-compression-threshold': 256,
  'online-mode': true,
  'op-permission-level': 4,
  'pause-when-empty-seconds': -1,
  'player-idle-timeout': 0,
  'prevent-proxy-connections': false,
  'query.port': 25565,
  'rate-limit': 0,
  'rcon.password': '',
  'rcon.port': 25575,
  'region-file-compression': 'deflate',
  'require-resource-pack': false,
  'resource-pack': '',
  'resource-pack-id': '',
  'resource-pack-prompt': '',
  'resource-pack-sha1': '',
  'server-ip': '',
  'server-port': 25565,
  'simulation-distance': 10,
  'spawn-protection': 16,
  'status-heartbeat-interval': 0,
  'sync-chunk-writes': true,
  'text-filtering-config': '',
  'text-filtering-version': 0,
  'use-native-transport': true,
  'view-distance': 10,
  'white-list': false,
};

const DEFAULT_CONFIG: EcmacraftConfig = {
  development: {
    paperVersion: 'latest',
    javaArgs: ['-Xmx2G', '-Xms512M'],
    reloadType: 'soft',
    serverProperties: DEFAULT_SERVER_PROPERTIES,
    esbuildConfig: {},
  },
  production: {
    paperVersion: 'latest',
    esbuildConfig: {},
  },
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfig(
  base: Record<string, unknown>,
  override: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!override) {
    return base;
  }

  const output: Record<string, unknown> = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = output[key];
    if (isObjectRecord(baseValue) && isObjectRecord(overrideValue)) {
      output[key] = mergeConfig(baseValue, overrideValue);
      continue;
    }

    output[key] = overrideValue;
  }

  return output;
}

export async function loadEcmacraftConfig(cwd: string): Promise<EcmacraftConfig> {
  for (const configName of CONFIG_FILES) {
    const configPath = join(cwd, configName);
    if (!existsSync(configPath)) {
      continue;
    }

    const imported = await import(pathToFileURL(configPath).href);
    const loaded = (imported.default ?? imported.config ?? imported) as DeepPartial<EcmacraftConfig>;

    const merged = mergeConfig(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      loaded as unknown as Record<string, unknown>,
    );

    return merged as unknown as EcmacraftConfig;
  }

  return DEFAULT_CONFIG;
}
