import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '5173'),
      strictPort: true, // Throw if port is already in use
      watch: {
        usePolling: true, // Use polling for Docker environments
        interval: 1000, // Check for changes every second
      },
    },
    define: {
      // Pass environment variables to the client-side code
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
  }
})
