import fs from "fs";
import { Route } from "../parser/parseRoutes";
import path from 'path';
import { resolveBody } from '../parser/resolveBody';
import { detectAuth, buildAuthHeader } from '../auth/detectAuth';
import { PostmanifyConfig } from '../config/loadConfig';
import { generateReport } from '../reporter/endpointReport';
import { generateDocs } from './generateDocs';


interface PostmanHeader {
    key: string;
    value: string;
}

interface PostmanBody {
    mode: string;
    raw: string;
    options: {
        raw: { language: string };
    };
}


interface PostmanItem {
    name: string;
    request: {
        method: string;
        header: PostmanHeader[];
        body?: PostmanBody;
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
  baseUrl = '{{baseUrl}}',
  config: PostmanifyConfig = {}  // ← new
): void {


    const groups = new Map<string, PostmanItem[]>();
    const bodyMap = new Map<string, Record<string, string> | null>();


  for (const route of routes) {
    const groupName = getGroupName(route.path);
    const body = resolveBody(route, path.dirname(outputPath));
    const requiresAuth = detectAuth(route, config);

    bodyMap.set(`${route.method}:${route.path}`, body);

    const headers: { key: string; value: string }[] = [];

    if (requiresAuth) {
      headers.push(...buildAuthHeader(config));
    }

    if (body) {
      headers.push({ key: 'Content-Type', value: 'application/json' });
    }

    const item: PostmanItem = {
      name: `${route.method} ${route.path}`,
      request: {
        method: route.method,
        header: headers,
        body: body
          ? {
              mode: 'raw',
              raw: JSON.stringify(body, null, 2),
              options: { raw: { language: 'json' } },
            }
          : undefined,
        url: {
          raw: `${baseUrl}${route.path}`,
          host: [baseUrl],
          path: route.path.split('/').filter(Boolean),
        },
      },
    };

    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(item);
  }

    const folders: PostmanFolder[] = Array.from(groups.entries()).map(
        ([name, items]: [string, PostmanItem[]]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
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
    generateReport(routes, bodyMap);

    
    const authRoutes = new Set<string>(
    routes
        .filter((r) => detectAuth(r, config))
        .map((r) => `${r.method}:${r.path}`)
    );

    const docsOutputPath = path.join(path.dirname(outputPath), 'api-docs.html');

    generateDocs({
    collectionName,
    baseUrl,
    routes,
    bodyMap,
    authRoutes,
    outputPath: docsOutputPath,
    });

    console.log(`📄 API docs saved to: api-docs.html\n`);
}