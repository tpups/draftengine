const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5246';
const IS_PRODUCTION = import.meta.env.PROD;
const API_TIMEOUT = 10000; // 10 seconds

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getApiUrl(endpoint: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}${IS_PRODUCTION ? '/api' : ''}/${path}`;
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new ApiError(408, 'Request timeout')), ms);
  });
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = response.statusText;
    let errorData;
    
    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorData.Message || errorMessage;
    } catch {
      // If response is not JSON, use statusText
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  // Return void for 204 No Content responses or when T is void
  if (response.status === 204 || typeof void 0 === (undefined as T)) {
    return undefined as T;
  }

  // For all other responses, try to parse JSON
  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    if (response.ok) {
      // If the response is OK but not JSON, return undefined
      return undefined as T;
    }
    throw new ApiError(response.status, 'Invalid JSON response');
  }
}

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const url = getApiUrl(endpoint);
    const response = await Promise.race([
      fetch(url),
      timeout(API_TIMEOUT)
    ]);
    return handleResponse<T>(response);
  },

  post: async <T>(endpoint: string, data?: any): Promise<T> => {
    const url = getApiUrl(endpoint);
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      }),
      timeout(API_TIMEOUT)
    ]);
    return handleResponse<T>(response);
  },

  put: async <T>(endpoint: string, data?: any): Promise<T> => {
    const url = getApiUrl(endpoint);
    const response = await Promise.race([
      fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      }),
      timeout(API_TIMEOUT)
    ]);
    return handleResponse<T>(response);
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const url = getApiUrl(endpoint);
    const response = await Promise.race([
      fetch(url, {
        method: 'DELETE',
      }),
      timeout(API_TIMEOUT)
    ]);
    return handleResponse<T>(response);
  },

  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const url = getApiUrl(endpoint);
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        body: formData,
      }),
      timeout(API_TIMEOUT)
    ]);
    return handleResponse<T>(response);
  },
};
