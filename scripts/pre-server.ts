import { writeFileSync, existsSync, mkdirSync, cpSync } from 'node:fs';

writeFileSync('eula.txt', 'eula=true');

if (!existsSync('plugins/ecmacraft')) {
  mkdirSync('plugins/ecmacraft', { recursive: true });
}

cpSync('../ecmacraft/target/ecmacraft-1.0-SNAPSHOT.jar', 'plugins/ecmacraft.jar');
cpSync('../packages/dev-plugin/dist/main.js', 'plugins/ecmacraft/main.js');
