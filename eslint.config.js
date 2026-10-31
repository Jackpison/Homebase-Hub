// ESLint for the readable site scripts in src/web (run: npx eslint src tools-app), and the Tools source in tools-app. Build and test tool only; nothing here ships.
// Not linted: Tools (prebuilt and minified, src/web/tools/assets) and every vendor/ folder (third-party libraries).
const globals = require('globals');

// The pages are classic scripts. shell.js (loaded first on every page) puts HUB on window; the pages read it.
const site = { ...globals.browser, HUB: 'readonly', HubSite: 'readonly', HubTabs: 'readonly' };

// cards.js, info.js and tasks.js declare their own top-level status(), find() and when() helpers. That is allowed in a
// classic script (window.status, window.find and window.when are writable and none of the pages use the browser ones),
// so for these three files only, the browser names are not listed as built-ins.
const ownHelpers = { status: 'off', find: 'off', when: 'off' };

const rules = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  'no-const-assign': 'error',
  // dead code: a variable or function nobody uses is an error (1.53.1). Leaving out fields on purpose ({ a, ...rest }) is fine.
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
  'no-self-assign': 'error',
  'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error',
};

module.exports = [
  { ignores: ['src/web/tools/assets/**', '**/vendor/**', 'build/**', '**/node_modules/**', 'website/**', 'tests/**', 'scripts/**'] },
  { files: ['src/web/**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: site }, rules },
  { files: ['src/web/cards/assets/cards.js', 'src/web/info/assets/info.js', 'src/web/tasks/assets/tasks.js'],
    languageOptions: { globals: ownHelpers } },
  // On the Info page only, shell.js opens a tab from a search link with Info's own TABS, showTab() and setHighlight()
  // (top-level names in info.js). It checks with typeof that they exist before using them.
  { files: ['src/web/hub/core/assets/shell.js'],
    languageOptions: { globals: { TABS: 'readonly', showTab: 'readonly', setHighlight: 'readonly' } } },
  // The Tools page's source (tools-app/): ES modules bundled by esbuild.
  { files: ['tools-app/src/**/*.js', 'tools-app/build.mjs'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser, ...globals.node } }, rules },
  // The Tools service worker runs in a worker, not a page.
  { files: ['src/web/tools/sw.js'], languageOptions: { globals: { ...globals.serviceworker } } },
];
