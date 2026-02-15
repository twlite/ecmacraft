import type { SpigotEvents } from './events.js';

export const EventHandlers: Record<string, Record<string, string>> = {};
(globalThis as Record<string, unknown>).EventHandlers = EventHandlers;

export function Event<E extends SpigotEvents>(eventName: E) {
  return function (target: any, propertyKey: string) {
    const className = target.constructor.name;
    if (!EventHandlers[className]) EventHandlers[className] = {};
    EventHandlers[className][propertyKey] = eventName;
  };
}

export const CommandHandlers: Record<string, Record<string, string>> = {};
(globalThis as Record<string, unknown>).CommandHandlers = CommandHandlers;

export function Command(commandName: string) {
  return function (target: any, propertyKey: string) {
    const className = target.constructor.name;
    if (!CommandHandlers[className]) CommandHandlers[className] = {};
    CommandHandlers[className][propertyKey] = commandName;
  };
}
