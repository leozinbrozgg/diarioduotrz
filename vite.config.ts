import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api/analyze';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'local-api-analyze',
        configureServer(server) {
          server.middlewares.use('/api/analyze', async (req: any, res: any) => {
            // Adaptar ServerResponse do Node para interface Express-like esperada pelo handler
            const nodeRes = res;
            const adaptedRes: any = {
              status(code: number) {
                nodeRes.statusCode = code;
                return this;
              },
              json(payload: any) {
                if (!nodeRes.getHeader('Content-Type')) {
                  nodeRes.setHeader('Content-Type', 'application/json');
                }
                nodeRes.end(JSON.stringify(payload));
              },
              setHeader: (...args: any[]) => nodeRes.setHeader.apply(nodeRes, args),
              getHeader: (...args: any[]) => (nodeRes as any).getHeader?.apply(nodeRes, args),
              end: (...args: any[]) => nodeRes.end.apply(nodeRes, args),
            };

            try {
              await (handler as any)(req, adaptedRes);
            } catch (e: any) {
              nodeRes.statusCode = 500;
              nodeRes.setHeader('Content-Type', 'application/json');
              nodeRes.end(JSON.stringify({ error: e?.message ?? 'Erro interno' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
