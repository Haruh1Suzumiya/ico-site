import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      // グローバル変数の定義
      define: {
        global: 'globalThis'
      },
      // 必要なポリフィルプラグインを追加
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  },
  resolve: {
    alias: {
      // Node.js 組み込みモジュールのポリフィル用エイリアス設定
      buffer: 'buffer',
      util: 'util'
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Sepolia RPC の CORS 対策用にローカルプロキシを設定
      '/rpc': {
        target: 'https://rpc.sepolia.org/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, '')
      }
    }
  }
});
