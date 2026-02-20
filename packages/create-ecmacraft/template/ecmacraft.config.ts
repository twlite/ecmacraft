import { defineConfig } from 'ecmacraft/config';

export default defineConfig({
  development: {
    serverProperties: {
      'online-mode': false,
      'level-seed': 'ecmacraft-dev-seed',
      'server-port': 25565,
      'query.port': 25565,
    },
  },
});
