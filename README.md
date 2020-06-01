rollup-plugin-body-iife
=======================

This plugin is designed to convert scripts that use static imports and early returns into valid JS or TS.
This is needed because this combination of language elements won't parse normally; both returns outside function bodies and non-top-level static imports fail parsing.