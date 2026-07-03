import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('./package.json') as { version: string }

const getBuildHash = () => {
  try {
    return execSync('git rev-parse --short=8 HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_HASH__: JSON.stringify(getBuildHash()),
  },
  plugins: [react()],
})
