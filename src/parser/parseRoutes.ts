import fs from "fs";

export interface Route {
    method: string;
    path: string;
    file: string;
}

// Pattern 1: router.get('/path', handler)
const DIRECT_REGEX = 
    /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;


// Pattern 2: router.route('/path').get().post().delete()...
const ROUTE_BASE_REGEX = 
    /(?:router|app)\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)((?:\s*\.(get|post|put|patch|delete)\s*\([^)]*\))+)/gi;


// Finds each .method() in a chained string
const METHOD_EXTRACT_REGEX =
    /\.(get|post|put|patch|delete)\s*\(/gi;
    

    export function parseRoutes(filePaths: string[]): Route[] {
        const routes: Route[] = [];

        for (const filePath of filePaths) {
            const content = fs.readFileSync(filePath, 'utf-8');

            // Pattern 1
            DIRECT_REGEX.lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = DIRECT_REGEX.exec(content)) !== null) {
                routes.push({
                    method: match[1].toUpperCase(),
                    path: match[2],
                    file: filePath,
                });
            }

            // Pattern 2
            ROUTE_BASE_REGEX.lastIndex = 0;

            while ((match = ROUTE_BASE_REGEX.exec(content)) !== null) {
                const routePath = match[1];
                const chainedPart = match[2];

                // Extract every method from the chained part
                METHOD_EXTRACT_REGEX.lastIndex = 0;
                let methodMatch: RegExpExecArray | null;

                while ((methodMatch = METHOD_EXTRACT_REGEX.exec(chainedPart)) !== null) {
                    routes.push({
                        method: methodMatch[1].toUpperCase(),
                        path: routePath,
                        file: filePath,
                    });
                }
            }
        }

        return routes;
    }