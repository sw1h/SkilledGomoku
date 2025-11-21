import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // 确保构建时正确处理静态资源路径
      build: {
        outDir: 'dist',
        assetsDir: '',
        emptyOutDir: true,
        // 处理GitHub Pages的基础路径
        base: '/SkilledGomoku/'
      },
      // 配置媒体文件处理
      optimizeDeps: {
        esbuildOptions: {
          resolveExtensions: ['.js', '.ts', '.jsx', '.tsx', '.mp3', '.wav', '.ogg']
        }
      }
    };
});
