import type { SpigotEvents } from './events.js';

type EnsureInstance<T> = T extends new (...args: any[]) => infer R ? R : never;

/**
 * Type helper to get the instance type of a Spigot event class.
 * @example
 * type PlayerJoinEvent = SpigotEventType<'PlayerJoinEvent'>;
 */
export type SpigotEventType<E extends SpigotEvents> = EnsureInstance<(typeof import('./jar_types.js'))[E]>;
