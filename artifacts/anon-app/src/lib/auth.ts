import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export const AUTH_TOKEN_KEY = "anon_token";
export const GUEST_ID_KEY = "anon_guest_id";

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthReq() {
  const token = getToken();
  return {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

// Helper hook for getting the current authenticated user safely
export function useCurrentUser() {
  const token = getToken();
  const query = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
    request: getAuthReq(),
  });

  return {
    user: query.data,
    isLoading: query.isLoading && !!token,
    isAuthenticated: !!query.data && !!token,
    error: query.error,
  };
}
