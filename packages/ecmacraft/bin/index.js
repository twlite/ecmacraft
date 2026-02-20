#!/usr/bin/env node

const cli = await import('../dist/cli/index.js');

await cli.bootstrapCLI();