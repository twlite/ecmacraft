declare global {
  interface JavaGlobal {
    type<T = any>(className: string): T;
  }

  export var Java: JavaGlobal;
}

export {};
