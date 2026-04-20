import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import Sidebar from "./components/layout/Sidebar";
import RecordingsPage from "./pages/RecordingsPage";
import ScenariosPage from "./pages/ScenariosPage";
import ArchivePage from "./pages/ArchivePage";
import photoImg from "./assets/photo.jpg"; // ודא שזה assets ולא assests
export default function App() {
  return (
    <Router>
      <div
        className="min-h-screen bg-slate-50 text-slate-900 font-sans flex relative"
        dir="rtl"
      >
        <div className="absolute top-6 left-8 z-30 pointer-events-none">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={photoImg}
                alt="Doppler Logo"
                className="w-20 h-20 rounded-full border-4 border-blue-500/30 shadow-2xl object-cover bg-white"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "./assests/photo.jpg";
                }}
              />
              <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-black/10" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm font-brand">
                דופל"ר
              </span>
              <div className="h-1 w-14 bg-blue-600 rounded-full -mt-1" />
            </div>
          </div>
        </div>

        <Sidebar />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<RecordingsPage />} />
                <Route path="/recordings" element={<RecordingsPage />} />
                <Route path="/scenarios" element={<ScenariosPage />} />
                <Route path="/archive" element={<ArchivePage />} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </Router>
  );
}
