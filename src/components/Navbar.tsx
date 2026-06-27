import { Link, useLocation, useNavigate } from "react-router-dom";
import { ScanSearch, AlignRight, X, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApi } from "../context/ApiContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { products, categories, searchProductsAPI } = useApi();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen || isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, isSearchOpen]);

  const [apiSearchResults, setApiSearchResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    return String(text)
      .toLowerCase()
      .replace(/[أإآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ـ/g, "");
  };

  useEffect(() => {
    const fetchApiSearch = async () => {
      const query = searchQuery.trim();
      if (!query) {
        setApiSearchResults([]);
        return;
      }
      setIsSearchingApi(true);
      try {
        const results = await searchProductsAPI(query, 50); // Get up to 50 results
        setApiSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingApi(false);
      }
    };

    const debounceTimer = setTimeout(fetchApiSearch, 400);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchProductsAPI]);

  const localSearchResults = products.filter(p => {
    const query = normalizeArabic(searchQuery);
    const nameMatch = p.name ? normalizeArabic(p.name).includes(query) : false;
    
    // Find category name if p.category is an ID
    const categoryObj = categories.find(c => c.id === p.category || c.name === p.category);
    const categoryName = categoryObj ? categoryObj.name : String(p.category || "");
    
    const categoryMatch = normalizeArabic(categoryName).includes(query);
    
    return nameMatch || categoryMatch;
  });

  // Combine local and API results, removing duplicates
  const searchResultsMap = new Map();
  [...localSearchResults, ...apiSearchResults].forEach(p => {
    searchResultsMap.set(p.id, p);
  });
  const searchResults = searchQuery.trim() === "" ? [] : Array.from(searchResultsMap.values());

  // Hide navbar on checkout/success for distraction-free experience
  if (location.pathname.startsWith('/product/')) {
    return null;
  }

  if (location.pathname === '/checkout' || location.pathname === '/success') {
    return (
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-center">
          <Link to="/" className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="سوق العراق الأول" className="h-14 sm:h-15 py-0.5 w-auto object-contain" referrerPolicy="no-referrer" />
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
          
          {/* Mobile Menu Icon (Hidden on desktop) */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-[#111827] hover:bg-gray-200 rounded-full transition-colors"
          >
            <AlignRight className="w-6 h-6" strokeWidth={1.25} />
          </button>

          {/* Logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-center gap-2">
            <img src="/logo.png" alt="سوق العراق الأول" className="h-14 sm:h-15 py-0.5 w-auto object-contain" referrerPolicy="no-referrer" />
          </Link>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-[#111827]">
            <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <Link to="/categories" className="hover:text-primary transition-colors">الأقسام</Link>
            <Link to="/latest" className="hover:text-primary transition-colors">أحدث المنتجات</Link>
            <Link to="/best-sellers" className="hover:text-primary transition-colors">الأكثر مبيعاً</Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-3">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-[#111827] hover:bg-gray-200 rounded-full transition-colors"
            >
              <ScanSearch className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.25} />
            </button>
          </div>
        </div>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col" 
            dir="rtl"
          >
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-50 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.25} />
              </button>
              <div className="flex-1 relative">
                                <input 
                  type="text" 
                  placeholder="ابحث عن المنتجات..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-gray-100 rounded-full py-3 px-5 pr-12 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
                <ScanSearch className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" strokeWidth={1.25} />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {searchQuery.trim() === "" ? (
                <div className="text-center text-gray-500 mt-10">
                  <ScanSearch className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>اكتب اسم المنتج للبحث</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map(product => (
                    <Link 
                      key={product.id} 
                      to={`/product/${product.id}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-4 p-3 rounded-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-16 h-16 bg-gray-50 rounded-sm overflow-hidden flex-shrink-0 p-1">
                        <img src={product.thumbnail || product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{product.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {categories.find(c => c.id === product.category || c.name === product.category)?.name || product.category}
                        </p>
                        <p className="text-primary font-black text-sm mt-1">{product.price.toLocaleString()} د.ع</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-10">
                  <p>لم يتم العثور على نتائج لـ "{searchQuery}"</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60] flex md:hidden" dir="rtl">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[80%] max-w-sm bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2">
                  <img src="/logo.png" alt="سوق العراق الأول" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
                </Link>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-5 space-y-1 mb-6">
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-3 font-bold text-[#111827] hover:text-primary transition-colors">الرئيسية</Link>
                  <Link to="/categories" onClick={() => setIsMenuOpen(false)} className="block py-3 font-bold text-[#111827] hover:text-primary transition-colors">الأقسام</Link>
                  <Link to="/latest" onClick={() => setIsMenuOpen(false)} className="block py-3 font-bold text-[#111827] hover:text-primary transition-colors">أحدث المنتجات</Link>
                  <Link to="/best-sellers" onClick={() => setIsMenuOpen(false)} className="block py-3 font-bold text-[#111827] hover:text-primary transition-colors">الأكثر مبيعاً</Link>
                </div>
                
                <div className="px-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">تصفح الأقسام</h3>
                  <div className="space-y-1">
                    {categories.filter(c => c.id !== "all").map(category => (
                      <Link 
                        key={category.id} 
                        to={`/?category=${encodeURIComponent(category.name)}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2.5 text-gray-600 hover:text-[#111827] hover:bg-gray-50 px-3 -mx-3 rounded-sm transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/25 text-primary flex items-center justify-center font-black text-lg select-none">
                    س
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#111827]">مرحباً بك</p>
                    <p className="text-xs text-gray-500">تسوق ممتع</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
