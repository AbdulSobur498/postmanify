import fs from "fs";
import path from "path";

export function scanRoutes(dir: string): string[] {
    const results: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (['node-modules', 'dist', '.git'].includes(entry.name)) continue;
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