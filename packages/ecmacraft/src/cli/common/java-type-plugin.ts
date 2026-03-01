import type { Plugin } from 'esbuild';

/**
 * Regex matching Java fully-qualified class names used as import specifiers.
 *
 * Examples: `java.io.File`, `org.bukkit.entity.Player`, `dev.twlite.ecmacraft.Foo`
 *
 * Must start with a lowercase letter, contain at least one dot,
 * and each segment must be a valid Java identifier start.
 */
const JAVA_FQCN_RE = /^[a-z]\w*(\.[a-zA-Z]\w*)+$/;

const JAVA_TYPE_NS = 'ecmacraft-java-type';

/**
 * esbuild plugin that transforms Java class imports into `Java.type()` calls.
 *
 * ```ts
 * import File from 'java.io.File';
 * // becomes → const File = Java.type('java.io.File');
 * ```
 */
export function javaTypePlugin(): Plugin {
  return {
    name: 'ecmacraft-java-type',
    setup(build) {
      build.onResolve({ filter: JAVA_FQCN_RE }, (args) => ({
        path: args.path,
        namespace: JAVA_TYPE_NS,
      }));

      build.onLoad({ filter: /.*/, namespace: JAVA_TYPE_NS }, (args) => ({
        contents: `export default Java.type("${args.path}");`,
        loader: 'js',
      }));
    },
  };
}
