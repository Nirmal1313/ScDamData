/**
 * Standard API Response wrapper
 * All API endpoints should return this structure
 */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  statusCode?: number;
  errors?: string[];
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Authentication response structure
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Login request structure
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
  timestamp?: string;
}
