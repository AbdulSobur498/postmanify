import fs from 'fs';
import path from 'path';
import { Route } from './parseRoutes';
import { extractBodyFields, extractFunctionBody } from './parseBody';

const SKIP_DIRS = ['node_modules', 'dist', '.git'];

function getAllFiles(dir: string): string[] {
    const results: string[] = [];

    function walk(current: string) {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIRS.includes(entry.name)) continue;
                walk(fullPath);
            } else if (
                entry.isFile() &&
                (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))
            ) {
                results.push(fullPath);
            }
        }
    }
    walk(dir);
    return results;
}


export function resolveBody(
  route: Route,
  projectDir: string
): Record<string, string> | null {
  if (!['POST', 'PUT', 'PATCH'].includes(route.method)) return null;

  if (route.handler === '__inline__') {
    const content = fs.readFileSync(route.file, 'utf-8');
    const fields = extractBodyFields(content);
    if (fields.length === 0) return null;
    return Object.fromEntries(fields.map((f) => [f, '']));
  }

  if (!route.handler) return null;
  const allFiles = getAllFiles(projectDir);

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(route.handler)) continue;

    const funcBody = extractFunctionBody(content, route.handler);
    const fields = extractBodyFields(funcBody || '');

    if (fields.length === 0) continue;
    return Object.fromEntries(fields.map((f) => [f, '']));
  }

  return null;
}