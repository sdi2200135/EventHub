import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    https: {
      key: fs.readFileSync('../certs/localhost-key.pem'),
      cert: fs.readFileSync('../certs/localhost.pem'),
    },
  },
})