import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // The App Check debug token has no VITE_ prefix, so Vite never exposes it by itself;
  // it's passed in only for `npm run dev` and is always empty in production builds.
  const { APPCHECK_DEBUG_TOKEN = '' } = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    define: {
      __APPCHECK_DEBUG_TOKEN__: JSON.stringify(command === 'serve' ? APPCHECK_DEBUG_TOKEN : ''),
    },
    server: {
      host: true, // also reachable from a phone on the same Wi-Fi
    },
  }
})
