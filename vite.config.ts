import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Validate API Keys
  const geminiKey = env.GEMINI_API_KEY;
  const youtubeKey = env.YOUTUBE_API_KEY;
  const metaToken = env.META_ACCESS_TOKEN;

  const isGeminiPlaceholder = !geminiKey || geminiKey.includes('your_') || geminiKey.length < 15;
  const isYoutubePlaceholder = !youtubeKey || youtubeKey.includes('your_') || youtubeKey.length < 15;
  const isMetaPlaceholder = !metaToken || metaToken.includes('your_') || metaToken.length < 15;

  if (isGeminiPlaceholder) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: GEMINI_API_KEY is not properly configured.');
  }
  if (isYoutubePlaceholder) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: YOUTUBE_API_KEY is not properly configured.');
  }
  if (isMetaPlaceholder) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: META_ACCESS_TOKEN is not properly configured.');
  }

  if (!isGeminiPlaceholder && !isYoutubePlaceholder && !isMetaPlaceholder) {
    console.log('\x1b[32m%s\x1b[0m', '✅ All critical API keys detected and validated.');
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
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
