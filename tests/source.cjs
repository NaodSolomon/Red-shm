const { registerHooks } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const ts = require('typescript');

// Use the app's TypeScript with Node's test runner and the existing TypeScript dependency.
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return next(specifier + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      const { outputText } = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext },
      });
      return { format: 'module', source: outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});

function source(path) {
  return import(pathToFileURL(resolve(__dirname, '..', 'src', path)).href);
}

module.exports = { source };
