// src/main.js

// Static import of the Supabase client (correct relative path)
 import { supabase, signIn, signUp, signOut, getUser } from "./lib/supabaseClient.js";
console.log('supabase client present:', !!supabase);

// --- TEMP DIAGNOSTIC: dynamic import check ---
(async () => {
  try {
    const mod = await import('./lib/supabaseClient.js');
    if (mod && mod.supabase) {
      console.log('Supabase client imported successfully (export name: supabase).');
    } else if (mod && (mod.default || Object.keys(mod).length)) {
      console.log('Supabase module imported; exports:', Object.keys(mod));
    } else {
      console.warn('Supabase module imported but no exports found.');
    }
  } catch (err) {
    console.error('Error importing ./lib/supabaseClient.js:', err);
  }
})();
// --- end diagnostic ---

// Expose to window for quick checks in DevTools (dev only)
window.supabase = supabase;

// Styles and assets
import './style.css';
import javascriptLogo from './javascript.svg';
import viteLogo from '/vite.svg';
import { setupCounter } from './counter.js';

// Render UI
document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>
    <div class="card">
      <button id="counter">count</button>
    </div>
  </div>
`;

setupCounter(document.querySelector('#counter'));