# Postmanify

Auto-generate Postman collections and API documentation from your Express.js backend.

## Preview

![Postmanify API Docs](assets/preview.png)

## Features

- 🔍 **Auto-scans** your Express route files
- 📁 **Groups routes** into folders by resource
- 📦 **Detects request body** fields from controllers
- 🔒 **Detects auth middleware** and adds Authorization headers
- 📊 **Endpoint report** showing documented and missing endpoints
- 📄 **Generates HTML API docs** alongside the Postman collection
- ⚙️ **Auto-generates config file** with smart defaults from your project

## Installation

```bash
npm install -g postmanify-cli
```

## Usage

After installing, run inside your Express project:

```bash
postmanify
```

On first run, Postmanify auto-generates a `postmanify.config.json` with smart defaults:
- Detects your route directory
- Reads project name from `package.json`
- Detects port from `.env`

### With flags (optional):

```bash
postmanify --dir ./src/routes --base-url http://localhost:5000 --name "My API"
```

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir` | Directory to scan | auto-detected |
| `-o, --output` | Output file name | `postman_collection.json` |
| `-n, --name` | Collection name | from `package.json` |
| `-b, --base-url` | Base URL | from `.env` |

## Config File

`postmanify.config.json` is auto-generated on first run:

```json
{
  "dir": "./src/routes",
  "baseUrl": "http://localhost:5000",
  "name": "My API",
  "output": "postman_collection.json",
  "authMiddleware": ["authenticate", "verifyToken", "protect"],
  "authType": "bearer"
}
```

### Auth types supported:

| Value | Header generated |
|-------|-----------------|
| `bearer` | `Authorization: Bearer {{token}}` |
| `basic` | `Authorization: Basic {{credentials}}` |
| `apikey` | `x-api-key: {{apiKey}}` |

## Supported Route Patterns

```ts
// Direct routes
router.get('/api/users', getUsers);
router.post('/api/users', authenticate, createUser);
router.post('/api/users', [auth, validate], createUser);

// Chained routes
router.route('/api/users').get(getUsers).post(createUser);
router.route('/api/users').get(getUsers).post(checkSchema(schema), createUser);

// Inline handlers
router.get('/api/users', async (req, res) => { ... });

// Any router variable name
app.get('/api/users', getUsers);
api.get('/api/users', getUsers);
v1.get('/api/users', getUsers);
```

## Output

Running `postmanify` generates three files in your project root:

- `postman_collection.json` — import directly into Postman
- `api-docs.html` — open in browser for beautiful API documentation
- `postmanify.config.json` — auto-generated config file, edit anytime


## Add to .gitignore
postman_collection.json
postmanify.config.json
api-docs.html

## Example Terminal Output
📄 Config file found: postmanify.config.json
🔍 Scanning: ./src/routes
✅ Found 5 routes:
GET     /api/users
POST    /api/users
GET     /api/users/:id
PUT     /api/users/:id
DELETE  /api/users/:id
📊 Endpoint Report:
─────────────────────────────────────────
✅ Fully documented:          4
⚠️  No body detected:         1
🔲 Inline handlers:           0
─────────────────────────────────────────
📌 Total endpoints:           5
🚀 Collection saved to: postman_collection.json
📄 API docs saved to: api-docs.html

## License

Sobur_Bello