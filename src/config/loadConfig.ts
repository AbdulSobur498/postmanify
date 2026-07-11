import fs from "fs";
import path from "path";

export interface PostmanifyConfig {
  dir?: string;
  baseUrl?: string;
  name?: string;
  output?: string;
  authMiddleware?: string[];
  authType?: 'bearer' | 'basic' | 'apikey';
  apiKeyHeader?: string; // custom header name for apikey e.g. 'x-api-key'
}

const COMMON_ROUTE_DIRS = [
    './src/routes',
    './routes',
    './src/api',
    './api',
];


function detectRouteDir(cwd: string): string {
    for (const dir of COMMON_ROUTE_DIRS) {
        if (fs.existsSync(path.join(cwd, dir))) {
            return dir;
        }
    }
    return './src/routes';
}

function detectProjectName(cwd: string): string {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
        return pkg.name || "My Project";
    } catch {
        return "My Project";
    }
}



function detectPort(cwd: string): { port: string; fromEnv: boolean } {
    try {
        const envPath = path.join(cwd, '.env');
        if (!fs.existsSync(envPath)) return { port: '3000', fromEnv: false };

        const env = fs.readFileSync(envPath, 'utf-8');
        const match = env.match(/^(?:PORT|APP_PORT|SERVER_PORT)\s*=\s*(\d+)/mi);

        if (match) return { port: match[1], fromEnv: true };

        return { port: '3000', fromEnv: false };
    } catch {
        return { port: '3000', fromEnv: false };
    }
}

function createConfig(cwd: string): PostmanifyConfig {
    const { port, fromEnv } = detectPort(cwd);

    const config: PostmanifyConfig = {
        dir: detectRouteDir(cwd),
        baseUrl: `http://localhost:${port}`,
        name: detectProjectName(cwd),
        output: 'postman_collection.json',
        authMiddleware: ['authenticate', 'verifyToken', 'protect', 'isAuthenticated', 'requireAuth'],
        authType: 'bearer',
        apiKeyHeader: 'x-api-key',
    };


    fs.writeFileSync(
        path.join(cwd, 'postmanify.config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
    );

    console.log(' Config file not found. Creating postmanify.config.json...');
    console.log(' Config file created with defaults. You can edit it anytime. \n');

    if (fromEnv) {
        console.log(` Port detected from .env: ${port} - update baseUrl in postmanify.config.json if this is wrong. \n`);
    } else {
        console.log(' Could not detect port from .env -defaulting to http://localhost:3000. Update baseUrl in postmanify.config.json if your port is different. \n');
    }

    return config;
}


export function loadConfig(cwd: string): PostmanifyConfig {
    const configPath = path.join(cwd, "postmanify.config.json");

    if (!fs.existsSync(configPath)) {
        return createConfig(cwd);
    }

    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(raw);
        console.log(' Config file found: postmanify.config.json\n');
        return config;
    } catch (err) {
        console.warn(' Could not parse postmanify.config.json, regenerating it.\n');
        return createConfig(cwd);
    }
}

