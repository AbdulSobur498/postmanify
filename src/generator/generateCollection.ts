import fs from "fs";
//import path from "path";
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

interface PostmanCollection {
    info: {
        name: string;
        schema: string;
    };
    item: PostmanItem[];
}

export function generateCollection(
    routes: Route[],
    outputPath: string,
    collectionName = 'Generated Collection',
    baseUrl = '{{baseUrl}}'
): void {
    const items: PostmanItem[] = routes.map((route) => ({
        name: `${route.method} ${route.path}`,
        request: {
            method: route.method,
            header: [],
            url: {
                raw: `${{baseUrl}}${route.path}`,
                host: [baseUrl],
                path: route.path.split('/').filter(Boolean),
            }
        }
    }));

    const collection: PostmanCollection = {
        info: {
            name: collectionName,
            schema: 
                'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: items,
    };

    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
}