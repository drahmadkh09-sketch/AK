import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Validate Gemini API Key
  const apiKey = env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || 
                        apiKey.includes('your_') || 
                        apiKey.includes('TODO') || 
                        apiKey.includes('key_here') ||
                        apiKey.length < 15;

  if (isPlaceholder) {
    console.warn('\x1b[33m%s\x1b[0m', 'âš ï¸  WARNING: GEMINI_API_KEY is not properly configured.');
    console.warn('\x1b[33m%s\x1b[0m', '   Please set a valid Gemini API key in the Settings menu to enable AI features.');
  } else {
    console.log('\x1b[32m%s\x1b[0m', 'âœ… GEMINI_API_KEY detected and validated.');
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
