import fs from "fs";
import { Route } from "../parser/parseRoutes";

interface PostmanItem {
    name: string;
    request: {
        method: string;
        header: [];
        url: {
            raw: string;
            host: string[];
            path: string[];
        };
    };
}

interface PostmanFolder {
    name: string;
    item: PostmanItem[];
}

interface PostmanCollection {
    info: {
        name: string;
        schema: string;
    };
    item: PostmanFolder[];
}

function getGroupName(routePath: string): string {
    const segments = routePath.split('/').filter(Boolean);

    // skip 'api' or 'v1', 'v2' prefixes
    const skip = ['api', 'v1', 'v2', 'v3'];
    const meaningful = segments.find((s) => !skip.includes(s.toLowerCase()));

    return meaningful || segments[0] || 'general';
}

export function generateCollection(
    routes: Route[],
    outputPath: string,
    collectionName = 'Generated Collection',
    baseUrl = '{{baseUrl}}'
): void {

    // Group routes by resource
    const groups = new Map<string, PostmanItem[]>();

    for (const route of routes) {
        const groupName = getGroupName(route.path);

        const item: PostmanItem = {
            name: `${route.method} ${route.path}`,
            request: {
            method: route.method,
            header: [],
            url: {
                raw: `${baseUrl}${route.path}`,
                host: [baseUrl],
                path: route.path.split('/').filter(Boolean),
            },
        },
    };

    if (!groups.has(groupName)) {
        groups.set(groupName, []);
    }
    groups.get(groupName)!.push(item);
}

    // Build folders
    const folders: PostmanFolder[] = Array.from(groups.entries()).map(
        ([name, items]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),   // capitalize
            item: items,
        })
    );

    const collection: PostmanCollection = {
        info: {
            name: collectionName,
            schema: 
                'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: folders,
    };

    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
}