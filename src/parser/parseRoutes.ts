import fs from 'fs';

export interface Route {
  method: string;
  path: string;
  file: string;
  handler?: string;
  middlewares?: string[]; // ← new
  requiresAuth?: boolean; // ← new
}

// Matches: router.route('/path').get(...).post(...)
const ROUTE_BASE_REGEX =
  /(?:router|app)\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)((?:\s*\.(get|post|put|patch|delete)\s*\((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*\))+)/gi;


function extractArgs(argsString: string): { middlewares: string[]; handler: string | undefined } {
  // Remove array middleware blocks [...]
  const withoutArrays = argsString.replace(/\[[\s\S]*?\]/g, '');

  // Remove spread operators
  const withoutSpreads = withoutArrays.replace(/\.\.\.\w+/g, '');

  // Split by comma respecting nested parentheses
  const args: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of withoutSpreads) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) args.push(current.trim());

  // Filter valid args
  const validArgs = args.filter((arg) => {
    const cleaned = arg.trim();
    if (!cleaned) return false;
    if (cleaned.includes('=>')) return false;
    if (cleaned.includes('function')) return false;
    if (/\w+\s*\(/.test(cleaned)) return false;
    if (cleaned.startsWith('.')) return false;
    if (/^(body|param|query|header|cookie)\s*\(/.test(cleaned)) return false;
    return true;
  });

  if (validArgs.length === 0) {
    return { middlewares: [], handler: '__inline__' };
  }

  // Last arg is handler, rest are middlewares
  const handler = validArgs[validArgs.length - 1]?.trim();
  const middlewares = validArgs.slice(0, -1).map((m) => m.trim());

  return { middlewares, handler };
}



function extractUsePrefix(content: string): string {
  // Matches: app.use('/api', router) or app.use('/api/v1', router)
  const USE_REGEX = /(?:app|server)\.use\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const match = USE_REGEX.exec(content);
  return match ? match[1].replace(/\/$/, '') : ''; // remove trailing slash
}

export function parseRoutes(filePaths: string[]): Route[] {
  const routes: Route[] = [];

  for (const filePath of filePaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const prefix = extractUsePrefix(content);

    // ─── Pattern 1a: router.get('/path', ...middlewares, handler) ───
    const DIRECT_NAMED =
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([\s\S]*?)\)(?=\s*[;,\n])/gi;

    DIRECT_NAMED.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = DIRECT_NAMED.exec(content)) !== null) {
      const { middlewares, handler } = extractArgs(match[3]);
      if (!handler) continue;

      routes.push({
        method: match[1].toUpperCase(),
        path: prefix + match[2],
        handler,
        middlewares,
        file: filePath,
      });
    }

    // ─── Pattern 1b: router.get('/path', async (req, res) => { ───
    const DIRECT_INLINE =
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\s*\([^)]*\)\s*=>/gi;

    DIRECT_INLINE.lastIndex = 0;
    while ((match = DIRECT_INLINE.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: prefix + match[2],
        handler: '__inline__',
        middlewares: [],
        file: filePath,
      });
    }

    // ─── Pattern 2: router.route('/path').get(...).post(...) ───
    ROUTE_BASE_REGEX.lastIndex = 0;
    while ((match = ROUTE_BASE_REGEX.exec(content)) !== null) {
      const routePath = prefix + match[1];
      const chainedPart = match[2];

      const METHOD_REGEX =
        /\.(get|post|put|patch|delete)\s*\(((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*)\)/gi;

      METHOD_REGEX.lastIndex = 0;
      let methodMatch: RegExpExecArray | null;

      while ((methodMatch = METHOD_REGEX.exec(chainedPart)) !== null) {
        const argsString = methodMatch[2];

        // Check if inline function
        if (argsString.includes('=>') || argsString.includes('function')) {
          routes.push({
            method: methodMatch[1].toUpperCase(),
            path: routePath,
            handler: '__inline__',
            middlewares: [],
            file: filePath,
          });
          continue;
        }

        const { middlewares, handler } = extractArgs(argsString);
        if (!handler) continue;

        routes.push({
          method: methodMatch[1].toUpperCase(),
          path: routePath,
          handler,
          middlewares,
          file: filePath,
        });
      }
    }
  }

  // Remove duplicate routes
  const seen = new Set<string>();
  return routes.filter((r) => {
    const key = `${r.method}:${r.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}