// web-application/src/utils/apiUtils.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || "/api") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  private getHeaders(token?: string, workspaceId?: string): Record<string, string> {
    const headers = { ...this.defaultHeaders };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (workspaceId) {
      headers["X-Workspace-Id"] = workspaceId;
    }

    return headers;
  }

  async request<T = any>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      body?: any;
      headers?: Record<string, string>;
      token?: string;
      workspaceId?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers: customHeaders = {},
      token,
      workspaceId,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.getHeaders(token, workspaceId),
      ...customHeaders,
    };

    const config: RequestInit = { method, headers };

    if (body && method !== "GET") {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: null,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: data.errors || [],
        };
      }

      return {
        success: data.success !== false,
        data: data.data || data,
        message: data.message,
        errors: data.errors,
      };
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        data: null,
        message: error instanceof Error ? error.message : "Network error occurred",
        errors: [],
      };
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, token?: string, workspaceId?: string) {
    return this.request<T>(endpoint, { method: "GET", token, workspaceId });
  }

  async post<T = any>(endpoint: string, body: any, token?: string, workspaceId?: string) {
    return this.request<T>(endpoint, { method: "POST", body, token, workspaceId });
  }

  async put<T = any>(endpoint: string, body: any, token?: string, workspaceId?: string) {
    return this.request<T>(endpoint, { method: "PUT", body, token, workspaceId });
  }

  async delete<T = any>(endpoint: string, token?: string, workspaceId?: string) {
    return this.request<T>(endpoint, { method: "DELETE", token, workspaceId });
  }
}

export const apiClient = new ApiClient();

//
// 🔹 Unified Utility Functions
//

// Normalize error into ApiError object
export const handleApiError = (error: any): ApiError => {
  if (error?.response) {
    return {
      message: error.response.data?.message || error.response.statusText || "API request failed",
      code: error.response.data?.code,
      status: error.response.status,
      details: error.response.data,
    };
  }

  if (error?.request) {
    return {
      message: "Network error - please check your connection",
      code: "NETWORK_ERROR",
    };
  }

  return {
    message: error?.message || "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
};

// Create standardized API response
export const createApiResponse = <T>(
  success: boolean,
  data: T | null = null,
  error?: string
): ApiResponse<T> => ({
  success,
  data,
  message: success ? "Success" : error || "Request failed",
  errors: success
    ? []
    : [
        {
          code: "ERROR",
          message: error || "Request failed",
        },
      ],
});

// Validate shape of API response
export const validateApiResponse = <T>(response: any): response is ApiResponse<T> => {
  return response && typeof response === "object" && "success" in response && "data" in response;
};

// Extract error message from any API error/response
export const getErrorMessage = (error: any): string => {
  if (typeof error === "string") return error;
  const apiError = handleApiError(error);
  return apiError.message;
};

// Error type guards
export const isPermissionError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 403 || apiError.code === "PERMISSION_DENIED";
};

export const isNotFoundError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 404 || apiError.code === "NOT_FOUND";
};

export const isValidationError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 400 || apiError.code === "VALIDATION_ERROR";
};

// Retry wrapper with exponential backoff
export const retryApiRequest = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      const apiError = handleApiError(error);
      if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
        throw error;
      }

      if (attempt === maxRetries) break;

      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
