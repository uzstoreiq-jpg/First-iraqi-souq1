import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle, ShieldCheck, ShoppingBag } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { trackPurchase } from "../utils/tracking";

export default function Success() {
  const location = useLocation();
  const { orderId, totalAmount, checkoutItems, userData, eventId } = location.state || {};

  useEffect(() => {
    window.scrollTo(0, 0);
    if (orderId && checkoutItems && totalAmount) {
      trackPurchase(orderId, checkoutItems, totalAmount, userData, eventId);
    }
  }, [orderId, checkoutItems, totalAmount, userData, eventId]);

  return (
    <PageTransition>
      <div className="min-h-[85vh] flex flex-col items-center justify-start pt-8 sm:pt-16 p-4 sm:p-6 select-none font-sans">
        <div className="w-full max-w-md bg-white p-6 sm:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-zinc-100/90 text-center relative overflow-hidden transition-all duration-300">
          {/* Accent colored top line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FA7C23] to-[#F36B13]"></div>
          
          {/* Animated checkmark circle */}
          <div className="mx-auto flex items-center justify-center h-[80px] w-[80px] sm:h-[96px] sm:w-[96px] rounded-full bg-emerald-50/70 mb-6 sm:mb-8 border-4 border-white shadow-[0_8px_24px_rgba(16,185,129,0.12)] relative">
            <div className="absolute inset-0 rounded-full bg-emerald-100/40 animate-pulse"></div>
            <CheckCircle className="h-[40px] w-[40px] sm:h-[48px] sm:w-[48px] text-emerald-500 relative z-10" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight leading-tight mb-6 font-sans">
            تم الحجز بنجاح!
          </h2>
          
          <div className="bg-emerald-50/30 border border-emerald-100/80 rounded-[24px] p-5 mb-6 text-center select-none max-w-sm mx-auto shadow-[0_10px_30px_-15px_rgba(16,185,129,0.15)] relative">
            <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-medium mt-1">
              سيتم التواصل معك قريبا عبر الواتساب لتأكيد الطلب الرجاء الرد على الرسالة بكلمة{" "}
              <span className="text-emerald-600 font-extrabold text-sm sm:text-base block mt-2.5 tracking-wider">
                - تم -
              </span>
            </p>
          </div>

          {/* تفاصيل الطلب */}
          {checkoutItems && checkoutItems.length > 0 && (
            <div className="bg-zinc-50/50 border border-zinc-250/10 rounded-3xl p-5 sm:p-6 mb-6 shadow-[0_12px_32px_rgba(0,0,0,0.015)] select-none text-right font-sans">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/40">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4.5 h-4.5 text-[#f97316]" strokeWidth={2} />
                  <span className="text-xs font-bold text-zinc-700">تفاصيل الطلب:</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {checkoutItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-center pb-4 last:pb-0 last:border-b-0 border-b border-zinc-200/20">
                    {/* Product Image Thumbnail - Premium Styled */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-zinc-200/30 overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-transform hover:scale-105 duration-300">
                      <img 
                        src={item.product?.thumbnail || item.product?.image} 
                        alt={item.product?.name} 
                        className="w-full h-full object-contain mix-blend-multiply" 
                        referrerPolicy="no-referrer" 
                        loading="lazy" 
                        decoding="async" 
                      />
                    </div>
                    {/* Product Name & Quantity */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                      <p className="font-medium text-zinc-800 text-xs sm:text-sm leading-relaxed line-clamp-2">
                        {item.product?.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <span>العدد:</span>
                        <span className="font-bold text-zinc-900">{item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {totalAmount && (
                  <div className="pt-4 mt-2 border-t border-dashed border-zinc-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-[#f97316]">المبلغ الإجمالي:</span>
                    <span className="text-sm font-semibold text-[#f97316] tracking-tight">
                      {totalAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning Banner regarding inspection on delivery */}
          <div className="bg-[#FFF9F2] border border-amber-100/50 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-2 mb-4 select-none font-sans">
            <ShieldCheck className="w-6 h-6 text-[#f97316] shrink-0" strokeWidth={2} />
            <div className="space-y-1 w-full">
              <span className="text-xs sm:text-[13px] font-bold text-[#f97316] block leading-none">تنبيه فحص المنتج</span>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-semibold leading-relaxed">
                يرجى فحص الطلب عند الاستلام للتأكد من سلامة المنتج
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
