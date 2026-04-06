import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for StudySphere client
// Proxies /api and /socket.io requests to Flask backend running on port 5000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,           // enable WebSocket proxying for Socket.IO
      },
    },
  },
})
