import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
import { resolve } from 'path'

// 本地开发时直接提供 uploads/ 静态文件，无需启动后端
const serveUploads = () => ({
  name: 'serve-uploads',
  configureServer(server) {
    server.middlewares.use('/uploads', sirv(resolve('uploads'), { dev: true }))
  },
})

export default defineConfig({
  plugins: [react(), serveUploads()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // /uploads 已由 serveUploads 中间件处理，仅在后端有其他 /uploads 路由时生效
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
