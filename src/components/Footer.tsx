import { Link, useLocation } from 'react-router-dom';
import { Facebook, Instagram, ShieldCheck, RefreshCcw, Banknote, Truck } from 'lucide-react';

export default function Footer() {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/product/');

  return (
    <footer className={`bg-white border-t border-gray-100 pt-6 pb-20 md:pb-6 ${isProductPage ? 'mt-2' : 'mt-8'} shadow-[0_-5px_20px_rgba(0,0,0,0.02)]`}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mb-6">
          
          {/* About Section */}
          <div className="col-span-1 md:col-span-4 space-y-3 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start">
              <Link to="/" className="inline-block transition-transform hover:scale-102">
                <img src="/logo.png" alt="سوق العراق الأول" className="h-11 w-auto object-contain" referrerPolicy="no-referrer" />
              </Link>
            </div>
            <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
              سوق العراق الأول وجهتكم الأولى للتسوق الإلكتروني. نقدم مجموعة واسعة من المنتجات عالية الجودة بأفضل الأسعار وتوصيل موثوق لجميع المحافظات.
            </p>
          </div>

          {/* Policies & Features */}
          <div className="col-span-1 md:col-span-5 space-y-3 border-y border-gray-100 py-4 md:py-0 md:border-y-0">
            <h3 className="text-sm font-black text-[#111827] mb-2 text-center md:text-right">ضماننا لك</h3>
            <ul className="grid grid-cols-2 gap-3">
              <li className="flex flex-col md:flex-row items-center md:items-start text-center md:text-right space-y-1.5 md:space-y-0 text-xs font-bold text-gray-600 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                <RefreshCcw className="w-4 h-4 md:ml-2 text-[var(--color-primary)] shrink-0" strokeWidth={2} />
                <span>ضمان استبدال<br className="md:hidden"/> لمدة 7 أيام</span>
              </li>
              <li className="flex flex-col md:flex-row items-center md:items-start text-center md:text-right space-y-1.5 md:space-y-0 text-xs font-bold text-gray-600 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                <ShieldCheck className="w-4 h-4 md:ml-2 text-[var(--color-primary)] shrink-0" strokeWidth={2} />
                <span>منتجات أصلية<br className="md:hidden"/> ومضمونة</span>
              </li>
              <li className="flex flex-col md:flex-row items-center md:items-start text-center md:text-right space-y-1.5 md:space-y-0 text-xs font-bold text-gray-600 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                <Banknote className="w-4 h-4 md:ml-2 text-[var(--color-primary)] shrink-0" strokeWidth={2} />
                <span>الدفع بأمان<br className="md:hidden"/> عند الاستلام</span>
              </li>
              <li className="flex flex-col md:flex-row items-center md:items-start text-center md:text-right space-y-1.5 md:space-y-0 text-xs font-bold text-gray-600 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                <Truck className="w-4 h-4 md:ml-2 text-[var(--color-primary)] shrink-0" strokeWidth={2} />
                <span>توصيل سريع وموثوق</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="col-span-1 md:col-span-3 space-y-3 text-center md:text-right flex flex-col items-center md:items-start">
            <h3 className="text-sm font-black text-[#111827] mb-1">تابعنا وتواصل معنا</h3>
            <div className="flex space-x-2 space-x-reverse justify-center md:justify-start">
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                <Facebook className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all">
                <Instagram className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>
          
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-100 pt-4 mt-4 flex flex-col items-center space-y-2 text-xs text-gray-500 font-medium">
          <p>© {new Date().getFullYear()} سوق العراق الأول. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
