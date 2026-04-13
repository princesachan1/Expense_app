import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../constants/config';

const TOKEN_KEY = 'user_auth_token';
const REQUEST_TIMEOUT = 10000; // 10 seconds

async function fetchWithTimeout(url: string, options: any = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection or try again later.');
    }
    throw error;
  }
}

export const AuthService = {
  async register(username: string, password: string, fullName: string) {
    try {
      const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, full_name: fullName }),
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, detail: error.message };
    }
  },

  async login(username: string, password: string) {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      if (data.access_token) {
        await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      }
      return data;
    } catch (error: any) {
      return { detail: error.message };
    }
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  },

  async getCurrentUser() {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        await this.logout();
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  },

  async updateProfile(fullName: string) {
    const token = await this.getToken();
    if (!token) return { success: false, detail: 'Not authenticated' };

    try {
      const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ full_name: fullName }),
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, detail: error.message };
    }
  }
};
