declare global {
  interface JavaGlobal {
    type<T = any>(className: string): T;
  }

  export var Java: JavaGlobal;
  export function requestAnimationFrame(callback: (timestamp: number) => void): number;
  export function cancelAnimationFrame(handle: number): void;
}

export {};
