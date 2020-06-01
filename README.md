rollup-plugin-body-iife
=======================

This plugin is designed to convert scripts that use static imports and early returns into valid JS or TS.
This is needed because this combination of language elements won't parse normally; both returns outside function bodies and non-top-level static imports fail parsing.

# Input

Here is an example of a file that this plugin will transform:

```javascript
import { checkGeoLocation } from '../util';

if (!checkGeoLocation(Flow.client.ipaddr)) return;

Application('suspiciousGeo').commit();
```

In this case, the desired output is:

```javascript
import { checkGeoLocation } from '../util';

(function () {
    if (!checkGeoLocation(Flow.client.ipaddr)) return;
    Application('suspiciousGeo').commit();
})();
```

This transformation allows build-time dependency resolution using existing tools by making the file valid JS.
Because the "main" function is immediately invoked, this is conceptually equivalent to leaving the main body outside a function declaration.

# Build-Time Invocation

Here is an example of how to invoke this plugin when using the [`rollup` module bundler](https://rollupjs.org).
In `rollup.config.js` in the project root, include the following:

```javascript
import * as glob from 'glob';
import bodyIife from 'rollup-plugin-body-iife';

/**
 * Glob pattern to match each trigger's script file.
 */
const TRIGGER_SCRIPT_GLOB = 'triggers/**/script.js';

/**
 * Inline dependencies and perform tree-shaking to convert an in-repo trigger
 * to one that is understood by the in-product trigger editor and runtime.
 *
 * @param {string} inputPath File path to the trigger script
 */
export const buildOneTrigger = inputPath => ({
    input: inputPath,
    output: {
        file: 'output/' + inputPath,
        format: 'cjs',
    },
    plugins: [
        bodyIife({
            // Only transform the triggers; transforming other JS files will
            // cause build errors.
            include: TRIGGER_SCRIPT_GLOB
        }),
    ],
});

/**
 * Rollup a JS "bundle" for each trigger.
 */
export default glob.sync(TRIGGER_SCRIPT_GLOB).map(buildOneTrigger);
```

It is recommended that this plugin run before others to ensure that later transforms get valid input.
The input and output paths can be changed freely.