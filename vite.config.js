import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import electron from 'vite-plugin-electron'
import { fileURLToPath } from 'url'

const __dirname_electron = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'H5记账本',
        short_name: '记账本',
        description: '一个基于 Vue 3 的移动端记账应用',
        theme_color: '#4f6ef7',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: './',
        scope: './'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    }),
    electron([
      {
        // 主进程入口
        entry: 'electron/main/index.cjs',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // 预加载脚本入口
        entry: 'electron/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname_electron, 'src')
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    host: true,
    port: 3000
  }
})
