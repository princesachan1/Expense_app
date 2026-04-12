import { API_CONFIG } from '../constants/Config';
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
      const headers = await getHeaders(false);
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXTRACT}`, {
        method: 'POST',
        headers,
        body: formData,
      });
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
      const headers = await getHeaders();
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}`, {
        method: 'POST',
        headers,
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
      const headers = await getHeaders();
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}/${id}`, {
        method: 'PUT',
        headers,
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
      const headers = await getHeaders();
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXPENSES}`, {
        headers
      });
      return await response.json();
    } catch (error) {
      console.error("apiService.fetchExpenses Error:", error);
      throw error;
    }
  }
};
