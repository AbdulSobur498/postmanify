import { Route } from '../parser/parseRoutes';
import { PostmanifyConfig } from '../config/loadConfig';

const DEFAULT_AUTH_MIDDLEWARES = [
  'authenticate',
  'verifyToken',
  'protect',
  'isAuthenticated',
  'requireAuth',
  'checkAuth',
  'verifyJWT',
  'isAuth',
  'authMiddleware',
  'isLoggedIn',
];

export function detectAuth(
  route: Route,
  config: PostmanifyConfig
): boolean {
  const authMiddlewares = [
    ...DEFAULT_AUTH_MIDDLEWARES,
    ...(config.authMiddleware || []),
  ];

  return (route.middlewares || []).some((m) =>
    authMiddlewares.includes(m)
  );
}

export function buildAuthHeader(
  config: PostmanifyConfig
): { key: string; value: string }[] {
  const authType = config.authType || 'bearer';

  switch (authType) {
    case 'bearer':
      return [{ key: 'Authorization', value: 'Bearer {{token}}' }];
    case 'basic':
      return [{ key: 'Authorization', value: 'Basic {{credentials}}' }];
    case 'apikey':
      return [{ key: config.apiKeyHeader || 'x-api-key', value: '{{apiKey}}' }];
    default:
      return [{ key: 'Authorization', value: 'Bearer {{token}}' }];
  }
}