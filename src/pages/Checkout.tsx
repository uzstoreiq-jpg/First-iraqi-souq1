import React, { useState, useEffect } from "react";
import DotsLoader from "../components/DotsLoader";
import { useLocation, useNavigate } from "react-router-dom";
import { trackInitiateCheckout } from "../utils/tracking";
import { Truck, ShieldCheck, ChevronRight, Tag, X, MessageCircle, Info } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useApi } from "../context/ApiContext";

const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "ذي قار", "كركوك", "الأنبار",
  "ديالى", "المثنى", "الديوانية", "ميسان", "واسط", "صلاح الدين", "دهوك",
  "السليمانية", "بابل", "كربلاء"
];

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { submitOrder } = useApi();
  
  // Determine if it's a direct buy or cart checkout
  const { product, quantity } = location.state || {};
  
  const checkoutItems = React.useMemo(() => product ? [{ product, quantity }] : [], [product, quantity]);
  const totalAmount = product ? product.price * quantity : 0;

  const [formData, setFormData] = useState({
    cus_name: "",
    cus_num1: "",
    capetel: "",
    address: "",
    note: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSubmitted = React.useRef(false);
  
  // Exit Intent State
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const hasClickedBackArrowRef = React.useRef(false);

  useEffect(() => {
    // Desktop exit intent
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitIntent && !hasSubmitted.current) {
        setShowExitIntent(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hasShownExitIntent]);

  // Handle hardware popstate (android back button)
  useEffect(() => {
    window.history.pushState(null, "", window.location.pathname);
    
    const handlePopState = () => {
      if (!hasSubmitted.current && !hasClickedBackArrowRef.current) {
        window.history.pushState(null, "", window.location.pathname);
        setShowExitIntent(true);
        hasClickedBackArrowRef.current = true;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Calculate shipping cost based on governorate
  const shippingCost = formData.capetel === "بغداد" ? 3000 : (formData.capetel ? 5000 : 0);

  const handleBackNavigation = () => {
    if (!hasClickedBackArrowRef.current && !hasSubmitted.current) {
      setShowExitIntent(true);
      hasClickedBackArrowRef.current = true;
    } else {
      navigate(-1);
    }
  };

  const finalTotal = totalAmount + shippingCost;

  useEffect(() => {
    if (!product && !hasSubmitted.current) {
      navigate("/");
      return;
    }
    if (checkoutItems.length > 0) {
      trackInitiateCheckout(checkoutItems, finalTotal);
    }
  }, [product, checkoutItems, finalTotal, navigate]);

  if (!product && !hasSubmitted.current) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "cus_num1") {
      // Allow Arabic and English numbers, convert Arabic to English
      const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      let numbersOnly = value.replace(/[^0-9٠-٩]/g, "");
      numbersOnly = numbersOnly.replace(/[٠-٩]/g, w => arabicNumbers.indexOf(w).toString());
      setFormData({ ...formData, [name]: numbersOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!product) throw new Error("Product data missing");

      let combinedNote = formData.note ? `ملاحظة العميل: ${formData.note} | ` : "";
      const allItemsDetails = `${product.name} (الكمية: ${quantity})`;
      
      combinedNote += `| الطلب الفعلي: ${allItemsDetails} | المجموع الكلي: ${finalTotal} د.ع`;

      // Single product order logic
      const orderPayload: any = {
        cus_name: formData.cus_name,
        cus_num1: formData.cus_num1,
        capetel: formData.capetel,
        city: "", // Optional field, leaving empty
        address: formData.address,
        item_id: Number(product.id),
        all_price: Number(finalTotal),
        count: Number(quantity),
        note: combinedNote
      };

      const result = await submitOrder(orderPayload);
      
      const orderId = result?.data?.order_id || `ORD-${Date.now()}`;
      
      hasSubmitted.current = true;

      // Redirect immediately on success
      const successEventId = `evt_purchase_${orderId}_${Date.now()}`;
      navigate("/success", { 
        state: { 
          orderId, 
          totalAmount: finalTotal, 
          checkoutItems,
          userData: {
            firstName: formData.cus_name,
            phone: formData.cus_num1,
          },
          eventId: successEventId 
        } 
      });
    } catch (err: any) {
      console.error("Checkout submission error:", err);
      
      // Handle rate limit error specifically
      if (err.message && (err.message.includes('Rate limit exceeded') || err.message.includes('1 per 5 minute'))) {
        setError("عذراً، لقد قمت بتقديم طلب مؤخراً. يرجى الانتظار 5 دقائق قبل تقديم طلب جديد.");
      } else if (err.message && err.message.includes('الطلب مكرر لهذا الرقم اليوم')) {
        setError("عذراً، لقد قمت بتقديم طلب مسبقاً بهذا الرقم اليوم. يرجى استخدام رقم هاتف آخر أو المحاولة غداً.");
      } else if (err.message && err.message.includes('سعر البيع خارج النطاق')) {
        setError("عذراً، حدث خطأ في مطابقة سعر المنتج. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.");
      } else if (err.message && err.message.includes('الربح بالسالب')) {
        setError("عذراً، سعر البيع أقل من التكلفة. يرجى التحقق من السعر.");
      } else if (err.message && err.message.includes('Internal Server Error')) {
        setError("حدث خطأ في الخادم (Internal Server Error). يرجى المحاولة مرة أخرى لاحقاً.");
      } else {
        setError(err.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto pb-12">
        <div className="flex items-center gap-3 mb-6 px-2">
          <button onClick={handleBackNavigation} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full shadow-sm border border-gray-100 text-gray-600 hover:text-[#111827]">
            <ChevronRight className="w-5 h-5" strokeWidth={1.25} />
          </button>
          <h1 className="text-xl font-black text-[#111827]">إتمام الطلب</h1>
        </div>

        {/* Compact Order Summary */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-gray-100 mb-6">
          <h3 className="font-bold text-[#111827] mb-4 px-1">ملخص الطلب ({checkoutItems.length} منتجات)</h3>
          <div className="space-y-3 mb-4">
            {checkoutItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 border-b border-gray-100 pb-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 p-1">
                  <img src={item.product.thumbnail || item.product.image} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#111827] text-sm line-clamp-1 leading-snug mb-1">{item.product.name}</h4>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-500 font-medium">الكمية: {item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-gray-500 font-medium text-sm">سعر المنتج</span>
              <span className="font-bold text-[#111827] text-sm">{totalAmount.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between items-center px-1 mb-3 border-b border-gray-100 pb-3">
              <span className="text-gray-500 font-medium text-sm">سعر التوصيل {formData.capetel ? `(${formData.capetel})` : ''}</span>
              <span className="font-bold text-[#111827] text-sm">{shippingCost > 0 ? `${shippingCost.toLocaleString()} د.ع` : (formData.capetel ? 'مجاناً' : 'يحدد حسب المحافظة')}</span>
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-gray-500 font-medium text-sm">المجموع الإجمالي</span>
              <span className="font-black text-primary text-xl">{finalTotal.toLocaleString()} د.ع</span>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="bg-white p-2.5 min-[340px]:p-3 min-[375px]:p-4 sm:p-8 rounded-[20px] sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-[var(--color-secondary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <Truck className="w-4 h-4" strokeWidth={1.25} />
            </div>
            <h2 className="text-lg font-bold text-[#111827]">معلومات التوصيل</h2>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-sm mb-6 border border-red-100 flex items-center gap-3 text-sm font-medium">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" strokeWidth={1.25} />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs md:text-[13px] font-bold text-zinc-800 mb-1.5 ml-0.5 select-none text-right">الاسم الكامل</label>
                <input
                  type="text"
                  name="cus_name"
                  required
                  value={formData.cus_name}
                  onChange={handleChange}
                  className="w-full px-3.5 md:px-4 h-[46px] min-[360px]:h-12 rounded-xl border-[1.5px] border-zinc-300/85 bg-[#fafafa] hover:bg-[#fafafa]/40 focus:bg-white text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-500 placeholder:font-medium placeholder:text-xs focus:ring-[3.5px] focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all duration-300 ease-in-out"
                  placeholder="الاسم واللقب"
                />
              </div>

              <div>
                <label className="block text-xs md:text-[13px] font-bold text-zinc-800 mb-1.5 ml-0.5 select-none text-right">رقم الهاتف</label>
                <input
                  type="tel"
                  name="cus_num1"
                  required
                  value={formData.cus_num1}
                  onChange={handleChange}
                  pattern="07[0-9]{9}"
                  minLength={11}
                  maxLength={11}
                  title="يرجى كتابة رقم هاتف عراقي صحيح يتكون من 11 رقم ويبدأ بـ 07 (مثل 077XXXXXXXX)"
                  className="w-full px-3.5 md:px-4 h-[46px] min-[360px]:h-12 rounded-xl border-[1.5px] border-zinc-300/85 bg-[#fafafa] hover:bg-[#fafafa]/40 focus:bg-white text-left font-bold tracking-wider text-zinc-900 outline-none placeholder:text-zinc-500 placeholder:font-medium placeholder:text-xs placeholder:tracking-normal focus:ring-[3.5px] focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all duration-300 ease-in-out"
                  placeholder="07xx xxx xxxx"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs md:text-[13px] font-bold text-zinc-800 mb-1.5 ml-0.5 select-none text-right">المحافظة</label>
                <select
                  name="capetel"
                  required
                  value={formData.capetel}
                  onChange={handleChange}
                  className="w-full px-3.5 md:px-4 pr-3.5 md:pr-4 pl-10 h-[46px] min-[360px]:h-12 rounded-xl border-[1.5px] border-zinc-300/85 bg-[#fafafa] hover:bg-[#fafafa]/40 focus:bg-white text-sm font-semibold text-zinc-900 appearance-none cursor-pointer outline-none focus:ring-[3.5px] focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all duration-300 ease-in-out select-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.8' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `left 0.85rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.25em 1.25em` }}
                >
                  <option value="" disabled className="text-zinc-[#71717a] font-medium text-xs">اختر محافظتك...</option>
                  {GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov} className="font-semibold text-zinc-800">{gov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-[13px] font-bold text-zinc-800 mb-1.5 ml-0.5 select-none text-right">العنوان التفصيلي</label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3.5 md:px-4 h-[46px] min-[360px]:h-12 rounded-xl border-[1.5px] border-zinc-300/85 bg-[#fafafa] hover:bg-[#fafafa]/40 focus:bg-white text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-500 placeholder:font-medium placeholder:text-xs focus:ring-[3.5px] focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all duration-300 ease-in-out"
                  placeholder="الحي، الشارع..."
                />
              </div>
            </div>

            {/* Removed the blue box about multiple products per user request */}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] shadow-[0_4px_12px_rgba(249,115,22,0.12)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.22)] text-white font-black py-4 rounded-xl transition-all flex justify-center items-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:animate-none text-2xl h-16 animate-heartbeat"
            >
              {isSubmitting ? (
                <>
                  <DotsLoader className="" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  تأكيد الطلب
                </>
              )}
            </button>
            
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-green-500" strokeWidth={1.25} />
              <span>معلوماتك مشفرة وآمنة 100%</span>
            </div>
          </form>
        </div>
      </div>

      {showExitIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExitIntent(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[24px] p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowExitIntent(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Tag className="w-10 h-10 text-red-500" />
            </div>
            
            <h3 className="text-2xl font-black text-[#111827] mb-2 tracking-tight">انتظر! ستفقد طلبك 😱</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">
              سيتم فقدان معلومات طلبك إذا غادرت الصفحة الآن!
            </p>
            
            <button 
              onClick={() => setShowExitIntent(false)}
              className="w-full bg-primary animate-shimmer text-white font-bold h-14 rounded-sm shadow-md active:scale-[0.98] transition-all"
            >
              إكمال الطلب الآن
            </button>
            <button 
              onClick={() => navigate("/")}
              className="w-full mt-3 text-gray-400 hover:text-gray-600 font-medium py-2 transition-colors"
            >
              لا شكراً، أريد المغادرة
            </button>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
