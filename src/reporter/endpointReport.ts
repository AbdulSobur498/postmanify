import { Route } from '../parser/parseRoutes';

export interface ReportResult {
  documented: Route[];
  noBody: Route[];
  inlineHandlers: Route[];
  getRoutes: Route[];
}

export function generateReport(
  routes: Route[],
  bodyMap: Map<string, Record<string, string> | null>
): void {
  const result: ReportResult = {
    documented: [],
    noBody: [],
    inlineHandlers: [],
    getRoutes: [],
  };

  for (const route of routes) {
    const key = `${route.method}:${route.path}`;
    const body = bodyMap.get(key);

    // GET and DELETE don't need body
    if (['GET', 'DELETE'].includes(route.method)) {
      result.getRoutes.push(route);
      continue;
    }

    if (route.handler === '__inline__') {
      result.inlineHandlers.push(route);
      continue;
    }

    if (['POST', 'PUT', 'PATCH'].includes(route.method) && body) {
      result.documented.push(route);
    } else {
      result.noBody.push(route);
    }
  }

  const total = routes.length;
  const documented = result.documented.length + result.getRoutes.length;

  console.log('\n📊 Endpoint Report:');
  console.log('─────────────────────────────────────────');
  console.log(`✅ Fully documented:          ${documented}`);
  console.log(`⚠️  No body detected:         ${result.noBody.length}`);
  console.log(`🔲 Inline handlers:           ${result.inlineHandlers.length}`);
  console.log('─────────────────────────────────────────');
  console.log(`📌 Total endpoints:           ${total}\n`);

  if (result.noBody.length > 0) {
    console.log('⚠️  Endpoints with no body detected:');
    result.noBody.forEach((r) =>
      console.log(`   ${r.method.padEnd(7)} ${r.path}`)
    );
    console.log();
  }

  if (result.inlineHandlers.length > 0) {
    console.log('🔲 Inline handlers (body may be missing):');
    result.inlineHandlers.forEach((r) =>
      console.log(`   ${r.method.padEnd(7)} ${r.path}`)
    );
    console.log();
  }

  if (result.noBody.length > 0 || result.inlineHandlers.length > 0) {
    console.log('💡 Tip: Add req.body destructuring in your controllers');
    console.log('   to help Postmanify detect request body fields.\n');
  }
}