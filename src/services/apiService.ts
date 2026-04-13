import { Recording, Timeline } from '../types';
import { API_BASE_URL } from '../config';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'API request failed');
  }
  return response.json();
};

export const apiService = {
  async getStatus(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      return handleResponse<{ status: string }>(response);
    } catch (error) {
      console.error('getStatus error:', error);
      throw error;
    }
  },

  async getRecordings(): Promise<Recording[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/recordings`);
      return handleResponse<Recording[]>(response);
    } catch (error) {
      console.error('getRecordings error:', error);
      throw error;
    }
  },

  async uploadRecording(file: Blob, title: string): Promise<Recording> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const response = await fetch(`${API_BASE_URL}/recordings`, {
        method: 'POST',
        body: formData,
      });

      return handleResponse<Recording>(response);
    } catch (error) {
      console.error('uploadRecording error:', error);
      throw error;
    }
  },

  async deleteRecording(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/recordings/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'Failed to delete recording');
      }
    } catch (error) {
      console.error('deleteRecording error:', error);
      throw error;
    }
  },

  async getTimelines(): Promise<Timeline[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/timelines`);
      return handleResponse<Timeline[]>(response);
    } catch (error) {
      console.error('getTimelines error:', error);
      throw error;
    }
  },

  async saveTimeline(title: string, sequence: any[]): Promise<Timeline> {
    try {
      const response = await fetch(`${API_BASE_URL}/timelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, sequence }),
      });
      return handleResponse<Timeline>(response);
    } catch (error) {
      console.error('saveTimeline error:', error);
      throw error;
    }
  },
};
