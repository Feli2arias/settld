import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Mismo alias que usa Next, para que los tests importen igual que la app.
    alias: { '@': path.resolve(import.meta.dirname, 'src') }
  }
})
