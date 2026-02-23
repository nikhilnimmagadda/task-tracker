import logger from './logger';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '254093090694-4ku52fdsljavvlfuvmlobf9gvrgd4dtu.apps.googleusercontent.com';

logger.info('[AuthConfig] Google OAuth config created', {
  clientId: GOOGLE_CLIENT_ID?.substring(0, 12) + '...'
});
