import { Link, useLocation } from "react-router-dom";
import { Store, Compass, Flame, Trophy } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  
  // Don't show on checkout or success pages to avoid distractions
  if (location.pathname === '/checkout' || location.pathname === '/success') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 pb-safe">
      <div className="flex justify-around items-center h-16 px-4 max-w-md mx-auto">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-gray-400 hover:text-[#111827]'}`}
        >
          <Store className="w-6 h-6" strokeWidth={location.pathname === '/' ? 2 : 1.25} />
          <span className="text-[10px] font-bold">الرئيسية</span>
        </Link>
        
        <Link 
          to="/categories"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${location.pathname === '/categories' ? 'text-primary' : 'text-gray-400 hover:text-[#111827]'}`}
        >
          <Compass className="w-6 h-6" strokeWidth={location.pathname === '/categories' ? 2 : 1.25} />
          <span className="text-[10px] font-bold">الأقسام</span>
        </Link>
        
        <Link 
          to="/latest" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${location.pathname === '/latest' ? 'text-primary' : 'text-gray-400 hover:text-[#111827]'}`}
        >
          <Flame className="w-6 h-6" strokeWidth={location.pathname === '/latest' ? 2 : 1.25} />
          <span className="text-[10px] font-bold">أحدث الأجهزة</span>
        </Link>

        <Link 
          to="/best-sellers" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${location.pathname === '/best-sellers' ? 'text-primary' : 'text-gray-400 hover:text-[#111827]'}`}
        >
          <Trophy className="w-6 h-6" strokeWidth={location.pathname === '/best-sellers' ? 2 : 1.25} />
          <span className="text-[10px] font-bold">الأكثر مبيعاً</span>
        </Link>
      </div>
    </div>
  );
}
