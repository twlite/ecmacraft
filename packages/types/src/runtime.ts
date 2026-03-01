import type { SpigotEvents } from './events.js';

const EventHandlers: Record<string, Record<string, string>> = {};
(globalThis as Record<string, unknown>).__ecmacraft_internal_state_store_$EventHandlers = EventHandlers;

export function Event<E extends SpigotEvents>(eventName: E) {
  return function (target: any, propertyKey: string) {
    const className = target.constructor.name;
    if (!EventHandlers[className]) EventHandlers[className] = {};
    EventHandlers[className][propertyKey] = eventName;
  };
}

const CommandHandlers: Record<string, Record<string, string>> = {};
(globalThis as Record<string, unknown>).__ecmacraft_internal_state_store_$CommandHandlers = CommandHandlers;

const AutocompleteHandlers: Record<string, Record<string, string>> = {};
(globalThis as Record<string, unknown>).__ecmacraft_internal_state_store_$AutocompleteHandlers = AutocompleteHandlers;

export function Command(commandName: string) {
  return function (target: any, propertyKey: string) {
    const className = target.constructor.name;
    if (!CommandHandlers[className]) CommandHandlers[className] = {};
    CommandHandlers[className][propertyKey] = commandName;
  };
}

export function Autocomplete(commandName: string) {
  return function (target: any, propertyKey: string) {
    const className = target.constructor.name;
    if (!AutocompleteHandlers[className]) AutocompleteHandlers[className] = {};
    AutocompleteHandlers[className][propertyKey] = commandName;
  };
}
