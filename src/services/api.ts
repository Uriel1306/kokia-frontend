import { Recording, Timeline } from '../types';

const BASE_URL = 'http://localhost:3000/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'API request failed');
  }
  return response.json();
};

export const apiService = {
  async getRecordings(): Promise<Recording[]> {
    const response = await fetch(`${BASE_URL}/recordings`);
    return handleResponse<Recording[]>(response);
  },

  async uploadRecording(file: Blob, title: string): Promise<Recording> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    const response = await fetch(`${BASE_URL}/recordings`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<Recording>(response);
  },

  async deleteRecording(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/recordings/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || 'Failed to delete recording');
    }
  },

  async getTimelines(): Promise<Timeline[]> {
    const response = await fetch(`${BASE_URL}/timelines`);
    return handleResponse<Timeline[]>(response);
  },

  async saveTimeline(title: string, sequence: any[]): Promise<Timeline> {
    const response = await fetch(`${BASE_URL}/timelines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, sequence }),
    });
    return handleResponse<Timeline>(response);
  },
};
