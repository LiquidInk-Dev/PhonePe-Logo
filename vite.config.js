import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // Classic runtime (React.createElement) mirrors Gatsby's default, so code that
    // works here also works in the host app, on any React 16 version
    react({ jsxRuntime: 'classic' }),
  ],
  define: {
    // The component gates Theatre Studio behind process.env.NODE_ENV, like Gatsby/webpack do
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  server: {
    host: true
  }
}))
