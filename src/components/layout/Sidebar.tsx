import { Archive, ListMusic, Mic, Activity } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { apiService } from "../../services/apiService";

export default function Sidebar() {
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [piStatus, setPiStatus] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const checkStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const response = await apiService.getStatus();
      console.log("Status response:", response);
      setStatus(response.online ? "שרת מחובר" : "שרת מנותק");
      setPiStatus(response.piConnected ? "מחובר" : "מנותק");
    } catch (err) {
      console.error("Status check failed:", err);
      setStatusError("לא ניתן להתחבר לשרת");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleStatusClick = () => {
    setShowStatusPopup(!showStatusPopup);
    if (!showStatusPopup) {
      checkStatus();
    }
  };

  return (
    <aside className="w-20 md:w-64 bg-white border-l border-slate-200 flex flex-col items-center md:items-stretch py-8 px-4 gap-8 shadow-sm z-20">
      <div className="hidden md:block px-4">
        <h2 className="text-xl font-bold text-blue-600">קוקיה</h2>
      </div>

      <nav className="flex flex-col gap-2 w-full">
        <NavLink
          to="/recordings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              isActive
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <Mic className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">
            יצירת הקלטות
          </span>
        </NavLink>

        <NavLink
          to="/scenarios"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              isActive
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <ListMusic className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">
            יצירת תרחיש
          </span>
        </NavLink>

        <NavLink
          to="/archive"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              isActive
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <Archive className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">
            ארכיון הקלטות
          </span>
        </NavLink>
      </nav>

      <div className="mt-auto relative">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 md:left-auto md:right-0 mb-4 bg-white rounded-lg shadow-lg border border-slate-200 p-4 w-56 z-50"
          >
            <div className="space-y-3">
              <div className="mt-auto relative items-center flex  gap-3 ">
                <Activity className="w-5 h-5" />
                <h3 className="hidden md:inline font-bold font-brand text-sm">
                  סטטוס מערכת
                </h3>
              </div>
              {statusLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : statusError ? (
                <div className="text-red-600 text-sm font-medium">
                  {statusError}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-slate-700 text-sm">
                    {status || "המערכת פעילה"}
                  </span>
                  <br></br>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>

                  <span className="text-slate-700 text-sm">
                    רוזברי פיי {piStatus || "מנותק"}
                  </span>
                </div>
              )}

              <button
                onClick={checkStatus}
                disabled={statusLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                {statusLoading ? "בדיקה..." : "רענן"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
