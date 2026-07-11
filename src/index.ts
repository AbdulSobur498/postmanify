import { Command } from "commander";
import path from "path";
import { scanRoutes } from "./scanner/scanRoutes";
import { parseRoutes, Route } from "./parser/parseRoutes";
import { generateCollection } from "./generator/generateCollection";
import { loadConfig } from "./config/loadConfig";

const program = new Command();

program
    .name('postmanify')
    .description('Auto-generate Postman collections from Express route files')
    .version('1.0.0')
    .option('-d, --dir <directory>', 'Directory to scan', '.')
    .option('-o, --output <file>', 'Output file name', 'postman_collection.json')
    .option('-n, --name <name>', 'Collection name', 'Generated Collection')
    .option('-b, --base-url <url>', 'Base URL for requests', '{{baseUrl}}')
    .action((options) => {
        const cwd = process.cwd();
        const config = loadConfig(cwd);

        // CLI flags override config file
        const targetDir = path.resolve(options.dir !== '.' ? options.dir : config.dir || '.');
        const outputFile = path.resolve(options.output !== 'postman_collection.json' ? options.output: config.output || 'postman_collection.json');
        const collectionName = options.name !== 'Generated Collection' ? options.name : config.name || 'Generated Collection';
        const baseUrl = options.baseUrl !== '{{baseUrl}}' ? options.baseUrl : config.baseUrl || '{{baseUrl}}';

        console.log(`\n🔍️ Scanning: ${targetDir}\n`);

        // Step1: Scan
        const files = scanRoutes(targetDir);
        if (files.length === 0) {
            console.log('❌ No route files found.');
            process.exit(1);
        }

        console.log(`📁 Found route files:`);
        files.forEach((f: string) => console.log(`  ${f}`));
        console.log();

        // Step2: Parse
        const routes = parseRoutes(files);
        if (routes.length === 0) {
            console.log('❌ No routes detected in those files.');
            process.exit(1);
        }

        console.log(`✅ Found ${routes.length} routes:\n`);
        routes.forEach((r: Route) => console.log(`  ${r.method.padEnd(7)} ${r.path}`));
        console.log();

        // Step3: Generate
        generateCollection(routes, outputFile, collectionName, baseUrl, config);
        console.log('Collection name:', collectionName);

        console.log(`🚀 Collection saved to: ${outputFile}\n`);
    });

    program.parse(process.argv);
