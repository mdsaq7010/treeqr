import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import os from 'node:os'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

function networkAddressPlugin(): Plugin {
  return {
    name: 'treeqr-network-address',
    configureServer(server) {
      server.middlewares.use('/__treeqr/address', (_request, response) => {
        const address = server.httpServer?.address()
        const port = typeof address === 'object' && address ? address.port : 5173
        const interfaces = os.networkInterfaces()
        const candidates = Object.values(interfaces)
          .flatMap((items) => items ?? [])
          .filter((item) => item.family === 'IPv4' && !item.internal)
          .map((item) => item.address)
        const ipv4 = candidates.find((address) => address.startsWith('10.'))
          ?? candidates.find((address) => address.startsWith('172.'))
          ?? candidates.find((address) => address.startsWith('192.168.'))
          ?? candidates[0]
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ host: ipv4 ?? 'localhost', port }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), networkAddressPlugin()],
})
