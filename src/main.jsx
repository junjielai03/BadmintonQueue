import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './style.css';
import App from './App.jsx';

const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const $app = document.getElementById('app');
// Dev only: /?mock runs the real schema in the browser instead of the live project (stripped from production builds)
const MOCK = import.meta.env.DEV && new URLSearchParams(location.search).has('mock');
if (!MOCK && (!URL || !KEY)) {
  $app.innerHTML = '<main class="auth"><div class="panel"><h1>Almost there</h1><p class="mute">Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> (or Vercel’s environment variables), then restart.</p></div></main>';
  throw new Error('Missing Supabase env vars');
}
const sb = MOCK ? await (await import('./dev/mock.js')).createMockClient() : createClient(URL, KEY);

createRoot($app).render(<App sb={sb} />);
