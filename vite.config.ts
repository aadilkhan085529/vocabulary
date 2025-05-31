import path from 'path';
import { defineConfig, loadEnv } from 'vite';
// Fix: Import fileURLToPath to help resolve __dirname in ESM
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Fix: Define __dirname for ESM compatibility
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return {
      base: "/vocabulary/",
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Fix: Use the ESM-compatible __dirname
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
