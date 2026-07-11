import fs from 'fs';
import { Route } from '../parser/parseRoutes';

interface DocsOptions {
  collectionName: string;
  baseUrl: string;
  routes: Route[];
  bodyMap: Map<string, Record<string, string> | null>;
  authRoutes: Set<string>;
  outputPath: string;
}

function getMethodColor(method: string): string {
  switch (method) {
    case 'GET': return '#61affe';
    case 'POST': return '#49cc90';
    case 'PUT': return '#fca130';
    case 'PATCH': return '#50e3c2';
    case 'DELETE': return '#f93e3e';
    default: return '#999';
  }
}

function buildSidebar(routes: Route[]): string {
  const groups = new Map<string, Route[]>();

  for (const route of routes) {
    const segments = route.path.split('/').filter(Boolean);
    const skip = ['api', 'v1', 'v2', 'v3'];
    const group = segments.find((s) => !skip.includes(s.toLowerCase())) || 'general';
    const key = group.charAt(0).toUpperCase() + group.slice(1);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(route);
  }

  let html = '';
  for (const [group, groupRoutes] of groups.entries()) {
    html += `<div class="sidebar-group">
      <div class="sidebar-group-title">📁 ${group}</div>`;
    for (const route of groupRoutes) {
      const id = `${route.method}-${route.path.replace(/\//g, '-').replace(/:/g, '')}`;
      html += `
        <div class="sidebar-item" onclick="scrollTo('${id}')">
          <span class="method-badge" style="background:${getMethodColor(route.method)}">${route.method}</span>
          <span class="sidebar-path">${route.path}</span>
        </div>`;
    }
    html += `</div>`;
  }
  return html;
}

function buildEndpoints(
  routes: Route[],
  bodyMap: Map<string, Record<string, string> | null>,
  authRoutes: Set<string>,
  baseUrl: string
): string {
  let html = '';

  for (const route of routes) {
    const key = `${route.method}:${route.path}`;
    const body = bodyMap.get(key);
    const isAuth = authRoutes.has(key);
    const id = `${route.method}-${route.path.replace(/\//g, '-').replace(/:/g, '')}`;

    html += `
    <div class="endpoint" id="${id}">
      <div class="endpoint-header">
        <span class="method-badge-lg" style="background:${getMethodColor(route.method)}">${route.method}</span>
        <span class="endpoint-path">${baseUrl}${route.path}</span>
        ${isAuth ? '<span class="auth-badge">🔒 Auth Required</span>' : ''}
      </div>

      ${isAuth ? `
      <div class="section">
        <div class="section-title">Headers</div>
        <div class="code-block">Authorization: Bearer {{token}}</div>
      </div>` : ''}

      ${body ? `
      <div class="section">
        <div class="section-title">Request Body</div>
        <pre class="code-block">${JSON.stringify(body, null, 2)}</pre>
      </div>` : ''}

      ${!body && ['POST', 'PUT', 'PATCH'].includes(route.method) ? `
      <div class="section">
        <div class="section-title">Request Body</div>
        <div class="no-body">⚠️ No body detected</div>
      </div>` : ''}
    </div>`;
  }

  return html;
}

export function generateDocs(options: DocsOptions): void {
  const { collectionName, baseUrl, routes, bodyMap, authRoutes, outputPath } = options;

  const sidebar = buildSidebar(routes);
  const endpoints = buildEndpoints(routes, bodyMap, authRoutes, baseUrl);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${collectionName} - API Docs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e0e0e0;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    /* TOP NAV */
    .topbar {
      background: #161b22;
      border-bottom: 1px solid #30363d;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: fixed;
      width: 100%;
      top: 0;
      z-index: 100;
    }

    .topbar-title {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }

    .topbar-meta {
      font-size: 12px;
      color: #8b949e;
    }

    .topbar-badge {
      background: #238636;
      color: #fff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    /* LAYOUT */
    .layout {
      display: flex;
      margin-top: 61px;
      height: calc(100vh - 61px);
    }

    /* SIDEBAR */
    .sidebar {
      width: 280px;
      background: #161b22;
      border-right: 1px solid #30363d;
      overflow-y: auto;
      padding: 24px 0;
      flex-shrink: 0;
    }

    .sidebar-group {
      margin-bottom: 8px;
    }

    .sidebar-group-title {
      padding: 8px 20px;
      font-size: 12px;
      font-weight: 700;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .sidebar-item:hover {
      background: #21262d;
    }

    .sidebar-path {
      font-size: 13px;
      color: #c9d1d9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* MAIN CONTENT */
    .main {
      flex: 1;
      overflow-y: auto;
      padding: 32px 48px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }

    .page-subtitle {
      color: #8b949e;
      font-size: 14px;
      margin-bottom: 40px;
    }

    .page-subtitle span {
      color: #58a6ff;
    }

    /* ENDPOINT CARD */
    .endpoint {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 10px;
      margin-bottom: 24px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .endpoint:hover {
      border-color: #58a6ff44;
    }

    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      background: #0d1117;
      border-bottom: 1px solid #30363d;
    }

    .endpoint-path {
      font-family: 'Courier New', monospace;
      font-size: 15px;
      color: #e6edf3;
      flex: 1;
    }

    .auth-badge {
      background: #b45309;
      color: #fef3c7;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    /* METHOD BADGES */
    .method-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      min-width: 52px;
      text-align: center;
    }

    .method-badge-lg {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      min-width: 72px;
      text-align: center;
    }

    /* SECTIONS */
    .section {
      padding: 16px 24px;
      border-bottom: 1px solid #21262d;
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
    }

    .code-block {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 14px 16px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #79c0ff;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .no-body {
      color: #8b949e;
      font-size: 13px;
      font-style: italic;
    }

    /* FOOTER */
    .footer {
      text-align: center;
      padding: 32px;
      color: #484f58;
      font-size: 12px;
    }

    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0f1117; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #484f58; }
  </style>
</head>
<body>

  <div class="topbar">
    <div class="topbar-title">🚀 ${collectionName}</div>
    <div class="topbar-meta">Generated by Postmanify · ${date}</div>
    <div class="topbar-badge">${routes.length} Endpoints</div>
  </div>

  <div class="layout">
    <div class="sidebar">
      ${sidebar}
    </div>

    <div class="main">
      <div class="page-title">${collectionName} API</div>
      <div class="page-subtitle">
        Base URL: <span>${baseUrl}</span>
      </div>

      ${endpoints}

      <div class="footer">
        Generated by <strong>Postmanify</strong> · ${date}
      </div>
    </div>
  </div>

  <script>
    function scrollTo(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  </script>

</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
}