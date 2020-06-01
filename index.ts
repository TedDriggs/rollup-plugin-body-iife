import { createFilter, FilterPattern } from "@rollup/pluginutils";

/**
 * Error thrown when a static import statement is found in the "body" portion
 * of a trigger. This likely indicates an improper trigger, but may indicate a
 * bug in the splitting code.
 *
 * @public
 */
export class ImportInBodyError extends Error {
  /**
   * @param lineNumber The line number in the input source where the
   * unexpected import was found.
   */
  constructor(public readonly lineNumber: number) {
    super(`Found import after body started (${lineNumber}:1)`);
  }
}

const isImportStatementStart = (line: string) => line.startsWith("import ");

/**
 * Check if a line could be part of a trigger's import region. We define the
 * import region to be everything from the start of the file down to - but not
 * including - the first non-import expression.
 *
 * @param line A single line of source code
 */
const couldBeImportBlockLine = (line: string): boolean =>
  // blank line
  line === "" ||
  // comments don't end the import region
  line.startsWith("//") ||
  line.startsWith("/*") ||
  // start of an import statement
  isImportStatementStart(line) ||
  // end of a multiline import statement. This is safe since we shouldn't
  // ever have entered a block that isn't an import block.
  line.startsWith("}") ||
  // multiline imports indent items, so we won't end the region if we see
  // leading whitespace.
  /^\s/.test(line);

/**
 * Split a file into its static imports and everything else. The script won't
 * parse in its raw form, since either it will complain about a `return`
 * outside a function body or - if we wrap everything in an IIFE - it will
 * complain about non-top-level imports.
 *
 * @param {string} code The input source code.
 * @returns {[string, string]} The import region and the body region
 */
const splitSource = (code: string): [string, string] => {
  const lines = code.split("\n");
  const bodyStart = lines.findIndex(line => !couldBeImportBlockLine(line));

  const body = lines.slice(bodyStart);

  if (body.some(isImportStatementStart)) {
    throw new ImportInBodyError(
      bodyStart + body.findIndex(isImportStatementStart)
    );
  }

  return [lines.slice(0, bodyStart).join("\n"), body.join("\n")];
};

/**
 * Wrap a block of code in an IIFE. This makes a block with early returns into
 * valid JS that rollup will parse.
 *
 * @param {string} code Input source
 */
const wrapInIife = (code: string): string => `(function() {
${code}
})();
`;

/**
 * Plugin options
 *
 * @public
 */
export interface Options {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

/**
 * Plugin to separate static imports from the module body and wrap the body in
 * an IIFE so that early returns don't block parsing.
 *
 * @param options Options for the plugin. Only entry points should be included
 * for transformation.
 */
export default function (options: Options = {}) {
  const filter = createFilter(options.include, options.exclude);

  return {
    transform(code: string, id: string): string | undefined {
      if (!filter(id)) return;

      const [imports, body] = splitSource(code);
      return [imports, wrapInIife(body)].join("\n");
    },
  };
}
