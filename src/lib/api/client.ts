const BASE_URL = ""; // Relative to the same host in development (proxied via Vite) and production

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// SSR-safe storage helpers
const isBrowser = typeof window !== "undefined";

export const authStorage = {
  getToken: () => (isBrowser ? localStorage.getItem("vortex_auth_token") : null),
  setToken: (token: string) => {
    if (isBrowser) {
      localStorage.setItem("vortex_auth_token", token);
    }
  },
  clearToken: () => {
    if (isBrowser) {
      localStorage.removeItem("vortex_auth_token");
    }
  },
  getUser: () => {
    if (!isBrowser) return null;
    const user = localStorage.getItem("vortex_auth_user");
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: any) => {
    if (isBrowser) {
      localStorage.setItem("vortex_auth_user", JSON.stringify(user));
    }
  },
  clearUser: () => {
    if (isBrowser) {
      localStorage.removeItem("vortex_auth_user");
    }
  },
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = authStorage.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = (data && typeof data === "object" && (data.message || data.error)) || response.statusText || "Request failed";
    throw new ApiError(
      Array.isArray(errorMessage) ? errorMessage.join(", ") : String(errorMessage),
      response.status,
      data
    );
  }

  return data as T;
}

export const client = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET" }),
  
  post: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  
  put: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  
  patch: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  
  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
