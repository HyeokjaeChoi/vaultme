export const THEME_KEY = 'vaultme-theme'

// The one theme implementation. Inline in <head>: it sets data-theme before first paint (no flash) and wires every
// [data-theme-toggle] button (auto -> light -> dark -> auto), so static pages need no React. `auto` = no attribute;
// tokens.css then follows prefers-color-scheme. The CSP carries the sha256 of this exact text (scripts/finalize.mjs).
export const THEME_SCRIPT = `(function(){var K='${THEME_KEY}',d=document,r=d.documentElement,N={auto:'light',light:'dark',dark:'auto'};
function get(){try{var v=localStorage.getItem(K);return v==='light'||v==='dark'?v:'auto'}catch(e){return'auto'}}
function set(t){if(t==='auto')delete r.dataset.theme;else r.dataset.theme=t;try{if(t==='auto')localStorage.removeItem(K);else localStorage.setItem(K,t)}catch(e){}}
function sync(b){b.setAttribute('aria-label',b.dataset.label+': '+JSON.parse(b.dataset.names)[get()])}
set(get());
d.addEventListener('DOMContentLoaded',function(){d.querySelectorAll('[data-theme-toggle]').forEach(sync)});
d.addEventListener('click',function(e){var b=e.target instanceof Element&&e.target.closest('[data-theme-toggle]');if(!b)return;set(N[get()]);d.querySelectorAll('[data-theme-toggle]').forEach(sync)});
})()`
