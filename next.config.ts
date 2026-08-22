import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // WDK usa sodium-universal, que por defecto pide el binding nativo `sodium-native`.
  // En el browser no existe, así que lo mandamos a la implementación en JS puro.
  turbopack: {
    resolveAlias: {
      'sodium-native': 'sodium-javascript'
    }
  }
}

export default nextConfig
