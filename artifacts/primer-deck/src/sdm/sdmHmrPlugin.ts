import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

const SDM_FILE = /\/src\/data\/slides\/([^/]+)\.sdm\.json$/;

export function sdmHmrPlugin(): Plugin {
  return {
    name: 'sdm-hmr',
    apply: 'serve',

    handleHotUpdate(ctx) {
      const match = SDM_FILE.exec(ctx.file.replace(/\\/g, '/'));
      if (!match) {
        return;
      }
      let document: unknown;
      try {
        document = JSON.parse(readFileSync(ctx.file, 'utf8'));
      } catch {
        return;
      }
      ctx.server.ws.send({
        type: 'custom',
        event: 'sdm:documentChanged',
        data: { slideId: match[1], document },
      });

      return [];
    },
  };
}
