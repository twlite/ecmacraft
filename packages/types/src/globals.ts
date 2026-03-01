declare global {
  interface JavaGlobal {
    type<T = any>(className: string): T;
  }

  export var Java: JavaGlobal;

  export function setTimeout(callback: (...args: any[]) => void, delay?: number, ...args: any[]): number;
  export function clearTimeout(id: number): void;
  export function setInterval(callback: (...args: any[]) => void, interval?: number, ...args: any[]): number;
  export function clearInterval(id: number): void;
  export function setImmediate(callback: (...args: any[]) => void, ...args: any[]): number;
  export function clearImmediate(id: number): void;
  export function queueMicrotask(callback: () => void): void;
  export function requestAnimationFrame(callback: (timestamp: number) => void): number;
  export function cancelAnimationFrame(handle: number): void;
}

export {};
