import type { BuildOptions } from 'esbuild';

export type ServerPropertyValue = string | number | boolean;
export type ServerProperties = Record<string, ServerPropertyValue>;

export interface CommonEnvironmentConfig {
  /**
   * The version of PaperMC to use for the development environment.
   * This can be a specific version (e.g., "1.16.5") or a version hint (e.g., "latest" or "1.16").
   * Defaults to `latest` if not specified.
   */
  paperVersion: string;
  /**
   * The esbuild configuration to be used when building the project.
   */
  esbuildConfig: BuildOptions;
}

export type ReloadType = 'hard' | 'soft' | 'none';

export interface DevConfig extends CommonEnvironmentConfig {
  /**
   * The Java cli arguments to be used when starting the development server.
   * This can include options like memory settings (e.g., `-Xmx2G`) or other JVM arguments.
   */
  javaArgs: string[];
  /**
   * Defines the reload type to be used during development.
   * When set to `'hard'`, sends `reload confirm` after a successful rebuild.
   * When set to `'soft'`, sends the safer plugin-scoped `ecmacraft-reload` command.
   * When set to `'none'`, no reload command will be sent after rebuilding, and the developer will need to manually reload the server or the plugin.
   * @default 'soft'
   */
  reloadType: ReloadType;
  /**
   * Key/value map for `server.properties` generated in `.ecmacraft/development/server.properties`.
   *
   * This allows controlling local development server behavior such as seed, online mode,
   * ports, view distance, MOTD, and other Paper/Vanilla server properties.
   */
  serverProperties: ServerProperties;
}

export interface ProductionConfig extends CommonEnvironmentConfig {}

export interface EcmacraftConfig {
  /**
   * Represents the configuration for the development environment.
   */
  development: DevConfig;
  /**
   * Represents the configuration for the production environment.
   */
  production: ProductionConfig;
}
