// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: 4321,
    // Listen on every interface. By default Astro binds localhost, which can
    // resolve to ::1 only, and `agentctl port-forward` connects to 127.0.0.1.
    host: true,
  },
});
