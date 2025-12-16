/**
 * API Configuration
 * 
 * Determines the base URL for API requests.
 * In development, defaults to localhost:5000
 * In production, uses VITE_API_URL environment variable
 */

// Get API base URL from environment variable or use default
const getApiBaseUrl = (): string => {
  // In production, use VITE_API_URL from environment
  if (process.env.NODE_ENV === 'production') {
    return process.env.VITE_API_URL || '';
  }

  // In development, default to relative path (Next.js API routes)
  return process.env.VITE_API_URL || '';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - API endpoint (e.g., '/api/products' or 'api/products')
 * @returns Full URL (e.g., 'https://api.example.com/api/products')
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // If endpoint already starts with 'api/', use it as is
  // Otherwise, prepend 'api/'
  const apiEndpoint = cleanEndpoint.startsWith('api/')
    ? cleanEndpoint
    : `api/${cleanEndpoint}`;

  // If API_BASE_URL is empty, use relative URLs (same origin)
  if (!API_BASE_URL) {
    return `/${apiEndpoint}`;
  }

  // Ensure API_BASE_URL doesn't end with a slash
  const baseUrl = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  return `${baseUrl}/${apiEndpoint}`;
}

