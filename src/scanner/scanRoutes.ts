import fs from "fs";
import path from "path";

const SKIP_DIRS = ['node_modules', 'dist', '.git', 'coverage', 'test', 'tests', '_tests_'];


export function scanRoutes(dir: string): string[] {
    const results: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (SKIP_DIRS.includes(entry.name)) continue;
                walk(fullPath);
            } else if (
                entry.isFile() &&
                (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))
            ) {
                // Only include files that contain route definitions
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (
                    content.includes('.get(') || 
                    content.includes('.post(') || 
                    content.includes('.put(') || 
                    content.includes('.patch(') || 
                    content.includes('.delete(') || 
                    content.includes('.route(')
                ) {
                    results.push(fullPath);
                }  
            }
        }
    }

    walk(dir);
    return results;
}