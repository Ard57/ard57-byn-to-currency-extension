/**
 * Content scripts cannot be ES modules, but they can import() one. This stub
 * loads the real entry point so the content script shares parse.js,
 * format.js and settings.js with the service worker instead of duplicating
 * them. Every imported file must be listed in web_accessible_resources.
 */
import(chrome.runtime.getURL('src/content-main.js')).catch(error => {
  console.error('BYN to Currency: failed to load content script —', error);
});
