import { API_CONFIG } from '../constants/config';
import { AuthService } from './AuthService';

export interface StructuredData {
  merchant?: string;
  total?: string;
  date?: string;
  category?: string;
  gstno?: string;
  items?: string[];
  filename?: string;
}

export interface ExtractionResponse {
  success: boolean;
  filename?: string;
  structured_data?: StructuredData;
  error?: string;
}

export interface ExpenseRecord {
  id: number;
  merchant: string;
  total: number;
  date: string;
  category: string;
  gstno?: string;
  items?: string[];
  created_at: string;
}

export interface HistoryResponse {
  success: boolean;
  expenses?: ExpenseRecord[];
}

async function getHeaders(isJson = true) {
  const token = await AuthService.getToken();
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Universal wrapper for fetch that handles 401 Unauthorized errors
 * by attempting to refresh the token and retrying the request once.
 */
async function safeFetch(url: string, options: RequestInit = {}, isJsonHeaders = true) {
  let headers = await getHeaders(isJsonHeaders);
  
  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.log(`[apiService] 401 Detected on ${url}. Attempting token refresh...`);
    const newToken = await AuthService.refreshToken();
    
    if (newToken) {
      console.log(`[apiService] Refresh successful. Retrying ${url}...`);
      headers = await getHeaders(isJsonHeaders); // Get fresh headers with new token
      response = await fetch(url, { ...options, headers });
    } else {
      console.warn(`[apiService] Refresh failed or no refresh token available. User must re-login.`);
    }
  }

  return response;
}

export const apiService = {
  /**
   * Uploads a receipt image for AI extraction. (NO DB SAVE)
   */
  async extractReceipt(photoUri: string): Promise<ExtractionResponse> {
    const formData = new FormData();
    const filename = photoUri.split('/').pop() || "receipt.jpg";

    formData.append('file', {
      uri: photoUri,
      name: filename,
      type: 'image/jpeg'
    } as any);

    try {
      const response = await safeFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXTRACT}`, {
        method: 'POST',
        body: formData,
      }, false);
      return await response.json();
    } catch (error) {
      console.error("apiService.extractReceipt Error:", error);
      throw error;
    }
  },

  /**
   * Saves a new expense to the database manually.
   */
  async saveExpense(data: Partial<ExpenseRecord>): Promise<{ success: boolean; id?: number }> {
    try {
      const response = await safeFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("apiService.saveExpense Error:", error);
      throw error;
    }
  },

  /**
   * Updates an existing expense.
   */
  async updateExpense(id: number, data: Partial<ExpenseRecord>): Promise<{ success: boolean }> {
    try {
      const response = await safeFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("apiService.updateExpense Error:", error);
      throw error;
    }
  },

  /**
   * Fetches the expense history.
   */
  async fetchExpenses(): Promise<HistoryResponse> {
    try {
      const response = await safeFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}`, {
        method: 'GET'
      });
      return await response.json();
    } catch (error) {
      console.error("apiService.fetchExpenses Error:", error);
      throw error;
    }
  },

  /**
   * Deletes an expense by ID.
   */
  async deleteExpense(id: number): Promise<{ success: boolean }> {
    try {
      const response = await safeFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}/${id}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error("apiService.deleteExpense Error:", error);
      throw error;
    }
  },

  /**
   * Sends a voice transcription to the backend for AI extraction.
   */
  async extractVoice(transcription: string): Promise<ExtractionResponse> {
    console.log(`[API] Sending transcription to backend: "${transcription}"`);
    try {
      const response = await safeFetch(`${API_CONFIG.BASE_URL}/api/extract-voice`, {
        method: 'POST',
        body: JSON.stringify({ transcription }),
      });
      const result = await response.json();
      console.log('[API] Voice extraction result:', result);
      return result;
    } catch (error) {
      console.error("[API] extractVoice Error:", error);
      throw error;
    }
  }
};
