import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export default function StatusPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiService.getStatus();
        setStatus(response.connected ? 'מחובר' : 'מנותק');
        setError(null);
      } catch (err) {
        console.error('Status check failed:', err);
        setError('לא ניתן להתחבר לשרת. וודא שהבאקאנד רץ בפורט 3000.');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6 text-center">סטטוס מערכת</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="mr-4 text-slate-600">בודק סטטוס...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 text-lg mb-4">שגיאה בבדיקת הסטטוס</div>
            <div className="text-slate-600">{error}</div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-green-600 text-2xl font-semibold mb-4">המערכת פעילה</div>
            <div className="text-slate-600">סטטוס: {status}</div>
            <div className="text-slate-500 text-sm mt-4">
              Backend URL: http://localhost:3001
            </div>
          </div>
        )}
      </div>
    </div>
  );
}