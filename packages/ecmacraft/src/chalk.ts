const colors = {
  black: '§0',
  darkBlue: '§1',
  darkGreen: '§2',
  darkAqua: '§3',
  darkRed: '§4',
  darkPurple: '§5',
  gold: '§6',
  gray: '§7',
  darkGray: '§8',
  blue: '§9',
  green: '§a',
  aqua: '§b',
  red: '§c',
  lightPurple: '§d',
  yellow: '§e',
  white: '§f',
} as const;

const formats = {
  obfuscated: '§k',
  bold: '§l',
  strikethrough: '§m',
  underline: '§n',
  italic: '§o',
  reset: '§r',
} as const;

const codes = { ...colors, ...formats } as const;

type StyleName = keyof typeof codes;

type Chalk = {
  [K in StyleName]: Chalk;
} & {
  (text: string): string;
  (strings: TemplateStringsArray, ...values: unknown[]): string;
};

function buildChalk(stack: StyleName[] = []): Chalk {
  const prefix = stack.map((s) => codes[s]).join('');

  const apply = (text: string): string => `${prefix}${text}§r`;

  const handler: ProxyHandler<typeof apply> = {
    apply(_target, _thisArg, args: [string | TemplateStringsArray, ...unknown[]]) {
      const first = args[0];

      if (Array.isArray(first) && 'raw' in first) {
        const strings = first as TemplateStringsArray;
        const values = args.slice(1);
        const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''), '');
        return apply(text);
      }

      return apply(String(first));
    },
    get(_target, prop: string) {
      if (prop in codes) {
        return buildChalk([...stack, prop as StyleName]);
      }
    },
  };

  return new Proxy(apply, handler) as unknown as Chalk;
}

export const chalk = buildChalk();
