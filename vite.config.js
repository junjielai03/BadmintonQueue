import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The project lives in iCloud-synced ~/Documents, which touches file metadata constantly. Native watch events
    // turned each touch into a reload (and touches on .env.local into a full server restart). Polling only reacts
    // to real changes in size or modified time.
    watch: { usePolling: true, interval: 500, ignored: ['**/graphify-out/**', '**/.claude/**', '**/dist/**'] },
  },
});
