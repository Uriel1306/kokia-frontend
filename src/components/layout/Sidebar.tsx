import { Archive, ListMusic, Mic, Activity, RefreshCw } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiService } from "../../services/apiService";

const labelMap: Record<string, string> = {
  online: "סטטוס שרת",
  piConnected: "חיבור רוזברי",
  storageLocation: "מיקום אחסון",
  freeSpace: "שטח פנוי",
  cpuTemperature: "טמפרטורת מעבד",
  uptime: "זמן פעולה",
  timestamp: "עדכון אחרון"
};

export default function Sidebar() {
  const [statusData, setStatusData] = useState<Record<string, any> | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const checkStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const response = await apiService.getStatus();
      setStatusData(response);
    } catch (err) {
      console.error("Status check failed:", err);
      setStatusError("שגיאת תקשורת");
    } finally {
      setStatusLoading(false);
    }
  };

  // טעינה ראשונית של הסטטוס כשפותחים את האתר
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <aside className="w-20 md:w-64 bg-white border-l border-slate-200 flex flex-col items-center md:items-stretch py-8 px-4 gap-6 shadow-sm z-20 h-screen">
      <div className="hidden md:block px-4">
        <h2 className="text-xl font-bold text-blue-600">קוקיה</h2>
      </div>

      <nav className="flex flex-col gap-2 w-full">
        <NavLink
          to="/recordings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              isActive ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <Mic className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">יצירת הקלטות</span>
        </NavLink>

        <NavLink
          to="/scenarios"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              isActive ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <ListMusic className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">יצירת תרחיש</span>
        </NavLink>

        <NavLink
          to="/archive"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              isActive ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <Archive className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">ארכיון הקלטות</span>
        </NavLink>
      </nav>

      {/* חלון סטטוס קבוע בתחתית */}
      <div className="mt-auto w-full">
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${statusData?.online ? 'text-green-500' : 'text-slate-400'}`} />
              <span className="text-xs font-bold text-slate-700">סטטוס מערכת</span>
            </div>
            <button 
              onClick={checkStatus}
              disabled={statusLoading}
              className="text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
              title="רענן נתונים"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {statusError ? (
            <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg text-center font-medium">
              {statusError}
            </div>
          ) : statusLoading && !statusData ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-2 bg-slate-200 rounded w-full"></div>
              <div className="h-2 bg-slate-200 rounded w-3/4"></div>
            </div>
          ) : statusData ? (
            <ul className="space-y-1.5">
              {Object.entries(statusData).map(([key, value]) => (
                <li key={key} className="flex justify-between items-center text-[10px] border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                  <span className="text-slate-500">
                    {labelMap[key] || key}
                  </span>
                  <span className={`font-semibold ${typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : 'text-slate-700'}`}>
                    {typeof value === 'boolean' ? (value ? "מחובר" : "מנותק") : String(value)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[10px] text-slate-400 text-center italic">ממתין לנתונים...</div>
          )}
        </div>
      </div>
    </aside>
  );
}