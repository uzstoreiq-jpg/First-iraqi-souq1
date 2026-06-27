import { useParams, useNavigate } from "react-router-dom";
import DotsLoader from "../components/DotsLoader";
import React, { useEffect, useState, useRef } from "react";
import { Product } from "../types";
import { trackViewContent, trackAddToCart, trackInitiateCheckout } from "../utils/tracking";
import { MoveRight, Shield, Lock, Info, Sparkles, ChevronRight, ChevronLeft, CreditCard, ShoppingBag, CornerDownLeft, Truck, ShieldCheck, Tag, X, Store, Star, Eye } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useApi } from "../context/ApiContext";

const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "ذي قار", "كركوك", "الأنبار",
  "ديالى", "المثنى", "الديوانية", "ميسان", "واسط", "صلاح الدين", "دهوك",
  "السليمانية", "بابل", "كربلاء"
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProductDetails, categories, products, submitOrder } = useApi();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  
  // Scroll & visibility tracking for Sticky CTA
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isCheckoutInView, setIsCheckoutInView] = useState(false);
  const [hasClickedCTA, setHasClickedCTA] = useState(false);

  const mainCTARef = useRef<HTMLDivElement>(null);
  const checkoutSectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const hasSubmitted = useRef(false);

  // Form State
  const [formData, setFormData] = useState({
    cus_name: "",
    cus_num1: "",
    capetel: "",
    address: "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadProduct = async () => {
      if (id) {
        setIsLoading(true);
        const foundProduct = await fetchProductDetails(id);
        if (foundProduct) {
          setProduct(foundProduct);
          trackViewContent(foundProduct);
        }
        setIsLoading(false);
      }
    };
    loadProduct();
  }, [id, fetchProductDetails]);

  useEffect(() => {
    // 1. Observe if the checkout form is in view to hide the sticky CTA
    const checkoutObserver = new IntersectionObserver(
      ([entry]) => {
        setIsCheckoutInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasClickedCTA(false); // Reset clicked state when we are at checkout
        }
      },
      { threshold: 0.1 }
    );

    if (checkoutSectionRef.current) {
      checkoutObserver.observe(checkoutSectionRef.current);
    }

    // 2. Setup scroll listener for tracking scroll direction
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Filter micro moves
      const diff = Math.abs(currentScrollY - lastScrollY);
      if (diff > 5) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsScrollingUp(false);
        } else if (currentScrollY < lastScrollY) {
          setIsScrollingUp(true);
          // If the user scrolls back up far from checkout, allow CTA to reappear
          if (currentScrollY < (checkoutSectionRef.current?.offsetTop || 0) - 300) {
            setHasClickedCTA(false);
          }
        }
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      checkoutObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  const scrollToImage = (index: number) => {
    setActiveImage(index);
    if (carouselRef.current) {
      const carousel = carouselRef.current;
      const width = carousel.clientWidth;
      carousel.scrollTo({
        left: (document.dir === 'rtl' ? -1 : 1) * (index * width),
        behavior: 'smooth'
      });
    }
  };

  const scrollToCheckout = () => {
    setHasClickedCTA(true);
    if (checkoutSectionRef.current) {
      checkoutSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
    setSubmitError(null);

    try {
      if (!product) throw new Error("Product data missing");

      // Free shipping requirement: finalTotal == totalAmount
      const finalTotal = product.price * quantity;
      
      let combinedNote = formData.note ? `ملاحظة العميل: ${formData.note} | ` : "";
      const allItemsDetails = `${product.name} (الكمية: ${quantity})`;
      
      combinedNote += `| الطلب الفعلي: ${allItemsDetails} | المجموع الكلي: ${finalTotal} د.ع (التوصيل مجاني)`;

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

      // Track purchase mapping logic
      const successEventId = `evt_purchase_${orderId}_${Date.now()}`;
      navigate("/success", { 
        state: { 
          orderId, 
          totalAmount: finalTotal, 
          checkoutItems: [{ product, quantity }],
          userData: {
            firstName: formData.cus_name,
            phone: formData.cus_num1,
          },
          eventId: successEventId 
        } 
      });
    } catch (err: any) {
      console.error("Checkout submission error:", err);
      
      if (err.message && (err.message.includes('Rate limit exceeded') || err.message.includes('1 per 5 minute'))) {
        setSubmitError("عذراً، لقد قمت بتقديم طلب مؤخراً. يرجى الانتظار 5 دقائق قبل تقديم طلب جديد.");
      } else if (err.message && err.message.includes('الطلب مكرر لهذا الرقم اليوم')) {
        setSubmitError("عذراً، لقد قمت بتقديم طلب مسبقاً بهذا الرقم اليوم. يرجى استخدام رقم هاتف آخر أو المحاولة غداً.");
      } else if (err.message && err.message.includes('سعر البيع خارج النطاق')) {
        setSubmitError("عذراً، حدث خطأ في مطابقة سعر المنتج. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.");
      } else if (err.message && err.message.includes('الربح بالسالب')) {
        setSubmitError("عذراً، سعر البيع أقل من التكلفة. يرجى التحقق من السعر.");
      } else if (err.message && err.message.includes('Internal Server Error')) {
        setSubmitError("حدث خطأ في الخادم (Internal Server Error). يرجى المحاولة مرة أخرى لاحقاً.");
      } else {
        setSubmitError(err.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <DotsLoader className="text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-bold text-[#111827]">المنتج غير موجود</h2>
        <button onClick={() => navigate('/')} className="text-primary hover:underline">العودة للرئيسية</button>
      </div>
    );
  }

  const userSelectedPrice = product.price * quantity;

  return (
    <PageTransition>
      <div className="bg-white rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-3 min-[375px]:p-4 md:p-8 border border-zinc-100/80 overflow-hidden relative pb-12 md:pb-3">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 lg:gap-12">
          {/* Product Images - Swipeable Carousel */}
          <div className="col-span-1 md:col-span-6 lg:col-span-5 space-y-3.5">
            
            {/* Floating Premium Price & Delivery Card (Outside Image Carousel) */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-8 w-full bg-white border border-zinc-100/80 rounded-[14px] py-2 sm:py-2.5 px-3 sm:px-6 shadow-[0_4px_18px_rgba(0,0,0,0.03)] select-none">
              <div 
                className="flex flex-wrap items-center gap-1.5 select-none min-w-0"
              >
                <span className="text-zinc-500 text-[13px] sm:text-[14px] font-medium leading-none select-none shrink-0">السعر:</span>
                <div className="flex flex-wrap items-baseline gap-0.5 shrink-0 mr-0.5">
                  <span className="text-[#f97316] text-[22px] sm:text-[25px] font-bold tracking-tight leading-none shrink-0">
                    {product.price.toLocaleString()}
                  </span>
                  <span className="text-[#f97316]/75 text-[11px] sm:text-xs font-extrabold mr-1 leading-none shrink-0">
                    د.ع
                  </span>
                  {product.oldPrice && (
                    <span className="text-zinc-400/50 font-medium text-[10px] sm:text-[11px] line-through decoration-red-500/20 mr-1.5 shrink-0 leading-none">
                      {product.oldPrice.toLocaleString()} د.ع
                    </span>
                  )}
                </div>
              </div>
              
              <div 
                className="flex items-center gap-1.5 bg-[#E8F5E9]/90 border border-emerald-100/30 text-[#2E7D32] px-2.5 py-1 rounded-[10px] text-[12px] sm:text-[13px] font-bold shrink-0"
              >
                <span className="leading-none">توصيل مجاني</span>
                <Truck className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" strokeWidth={2.4} />
              </div>
            </div>

            <div className="aspect-square bg-white rounded-xl md:rounded-3xl overflow-hidden relative border border-gray-100 shadow-lg shadow-gray-200/30 group">
              <div 
                ref={carouselRef}
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar h-full w-full" 
                style={{ scrollBehavior: 'smooth' }}
                onScroll={(e) => {
                  const scrollLeft = e.currentTarget.scrollLeft;
                  const width = e.currentTarget.clientWidth;
                  setActiveImage(Math.round(Math.abs(scrollLeft / width)));
                }}
              >
                {product.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.includes('wsrv.nl') ? img : `https://wsrv.nl/?url=${encodeURIComponent(img)}&w=800&output=webp&q=75`}
                    alt={`${product.name} - ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    decoding="async"
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="w-full h-full object-cover snap-center flex-shrink-0 transition-transform duration-700 group-hover:scale-105"
                  />
                ))}
              </div>
              
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none z-10"></div>

              {/* Product Name Overlay */}
              <div className="absolute bottom-14 right-4.5 left-4.5 text-right z-20 pointer-events-none select-none space-y-1">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-wide leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {product.name}
                </h2>
              </div>

              {/* Carousel Indicators */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-25">
                {product.images.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => scrollToImage(idx)}
                    aria-label={`عرض الصورة رقم ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === idx ? 'w-8 bg-white shadow-sm' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Thumbnail Strip (Desktop mainly) */}
            <div className="hidden md:flex gap-3 max-h-40 overflow-y-auto hide-scrollbar px-1">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => scrollToImage(idx)}
                  className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden bg-white ${activeImage === idx ? 'ring-2 ring-[var(--color-primary)] ring-offset-2' : 'border border-gray-100 hover:border-gray-300'} transition-all`}
                >
                  <img src={img.includes('wsrv.nl') ? img : `https://wsrv.nl/?url=${encodeURIComponent(img)}&w=200&output=webp&q=60`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="col-span-1 md:col-span-6 lg:col-span-7 flex flex-col space-y-3 md:space-y-3.5">

            {/* Trust and Rating Section */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full py-2 px-4 bg-zinc-50/40 border border-zinc-100/70 rounded-xl select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600/95 shrink-0" strokeWidth={1.8} />
                <span className="text-[12px] sm:text-[12.5px] font-normal text-zinc-500 tracking-wide text-center">منتج أصلي 100%</span>
              </div>
              
              <div className="hidden sm:block h-3 w-[1px] bg-zinc-200/60 shrink-0" />
              
              <div className="flex items-center gap-1.5 min-w-0">
                <Eye className="w-4 h-4 text-[#f97316]/95 shrink-0" strokeWidth={1.8} />
                <span className="text-[12px] sm:text-[12.5px] font-normal text-zinc-500 tracking-wide text-center">فحص عند الإستلام</span>
              </div>
            </div>

            {/* IN-PAGE CHECKOUT FORM */}
            <div ref={checkoutSectionRef} className="bg-white rounded-[20px] min-[375px]:rounded-3xl p-5 min-[375px]:p-6 md:p-7 space-y-5.5 shadow-[0_6px_30px_rgba(249,115,22,0.02)] border border-[#f97316]/15 mt-0 outline outline-4 outline-[#f97316]/4">
              <div className="flex items-center gap-2.5 border-b border-zinc-100/80 pb-4.5 text-right">
                <span className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] shrink-0">
                  <Truck className="w-5 h-5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-[#050505] leading-none">أكمل طلبك الآن</h3>
                  <p className="text-[11px] md:text-xs text-zinc-500/95 font-medium mt-1.5 leading-normal">يرجى إدخال معلوماتك أدناه لتأكيد الطلب</p>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-xl mb-4 border border-red-100/80 flex items-center gap-2.5 text-xs font-semibold">
                  <ShieldCheck className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.5} />
                  <p>{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* عدد القطع */}
                <div className="flex items-center justify-between w-full min-h-[48px] py-2 px-3.5 bg-zinc-50/70 border border-zinc-100 rounded-2xl select-none text-right gap-2">
                  <span className="text-xs md:text-[13px] font-bold text-zinc-800">عدد القطع</span>
                  <div className="flex items-center justify-between bg-zinc-100/80 border border-zinc-200/10 p-0.5 rounded-xl h-9 w-[115px] shrink-0 select-none">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 bg-white border border-zinc-200/15 rounded-lg text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none"
                      type="button"
                    >
                      <span className="text-base font-normal leading-none -translate-y-[0.5px] select-none">-</span>
                    </button>
                    <span className="flex-1 text-center font-bold text-base text-zinc-900 select-none leading-none">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 bg-white border border-zinc-200/15 rounded-lg text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none"
                      type="button"
                    >
                      <span className="text-base font-normal leading-none -translate-y-[0.5px] select-none">+</span>
                    </button>
                  </div>
                </div>

                {/* إجمالي الطلب */}
                <div className="flex items-center justify-between w-full min-h-[44px] py-2 px-3.5 bg-[#f97316]/[0.02] border border-[#f97316]/10 rounded-2xl select-none text-right shadow-[0_1px_5px_rgba(249,115,22,0.005)] gap-2">
                  <span className="text-xs md:text-[13px] font-bold text-[#f97316]">إجمالي الطلب</span>
                  <div className="text-left select-none">
                    <span className="text-base md:text-lg font-black text-[#f97316]">{userSelectedPrice.toLocaleString()} د.ع</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs md:text-[13px] font-bold text-zinc-800 mb-1.5 ml-0.5 select-none text-right">الاسم الكامل</label>
                    <input
                      type="text"
                      name="cus_name"
                      required
                      value={formData.cus_name}
                      onChange={handleChange}
                      className="w-full px-3.5 md:px-4 h-[46px] min-[360px]:h-12 rounded-xl border-[1.5px] border-zinc-300/85 bg-[#fafafa] hover:bg-[#fafafa]/40 focus:bg-white text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-500 placeholder:font-medium placeholder:text-xs focus:ring-[3.5px] focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all duration-300 ease-in-out"
                      placeholder="اكتب اسمك هنا"
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
                      placeholder="07XX XXX XXXX"
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
                      <option value="" disabled className="text-zinc-500 font-medium text-xs">اختر محافظتك...</option>
                      {GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov} className="font-semibold text-zinc-800">{gov}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs md:text-[13px] font-bold text-zinc-800 mb-1.5 ml-0.5 select-none text-right">العنوان الكامل</label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3.5 md:px-4 h-[46px] min-[360px]:h-12 rounded-xl border-[1.5px] border-zinc-300/85 bg-[#fafafa] hover:bg-[#fafafa]/40 focus:bg-white text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-500 placeholder:font-medium placeholder:text-xs focus:ring-[3.5px] focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all duration-300 ease-in-out"
                      placeholder="اسم المنطقة، الشارع، أقرب نقطة دالة..."
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#f97316] hover:bg-[#fa7b24] shadow-[0_4px_12px_rgba(249,115,22,0.12)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.22)] text-white font-black py-2.5 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 active:scale-[0.98] active:bg-[#ea580c] disabled:opacity-75 disabled:cursor-not-allowed text-lg h-12.5 select-none animate-soft-pulse"
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
                </div>
                
                <div className="flex items-center justify-center gap-2 mt-3.5 text-[11px] text-zinc-400 font-semibold select-none">
                  <ShieldCheck className="w-4 h-4 text-green-500" strokeWidth={1.5} />
                  <span>معلوماتك مشفرة وآمنة 100%</span>
                  <span className="mx-1">•</span>
                  <span className="text-[#22C55E] font-bold">التوصيل مجاني 🚚</span>
                </div>
              </form>
            </div>

            {/* Simple Description Block */}
            <div className="bg-white rounded-3xl p-4 min-[375px]:p-5 md:p-8 space-y-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <span className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[var(--color-primary)]">
                  <Info className="w-5 h-5" strokeWidth={2} />
                </span>
                <h3 className="text-xl font-black text-[#111827]">تفاصيل المنتج</h3>
              </div>
              
              <div className="prose prose-sm md:prose-base prose-slate max-w-none text-gray-600 leading-loose">
                {product.description.split('\n').map((paragraph, idx) => (
                  paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
                ))}
              </div>

               {product.features && product.features.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4 min-[375px]:p-5 border border-gray-100">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                          <Sparkles className="w-3 h-3" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>


          </div>
        </div>

        {/* Sticky Mobile/Desktop CTA */}
        {(() => {
          const shouldShowButton = isScrollingUp && !isCheckoutInView && !hasClickedCTA;
          return (
            <div className={`fixed bottom-4 left-0 right-0 px-4 py-2 z-[49] transition-all duration-300 pointer-events-none ${shouldShowButton ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
              <div className={`max-w-md mx-auto ${shouldShowButton ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <button
                  onClick={scrollToCheckout}
                  className="w-full bg-[#2C3947] text-[#F97316] h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(5,5,5,0.18)] hover:shadow-[0_12px_35px_rgba(5,5,5,0.25)] active:scale-[0.98] transition-all duration-300 border-0 outline-none animate-soft-pulse-dark"
                >
                  <ShoppingBag className="w-5 h-5 text-[#F97316]" strokeWidth={2.5} />
                  أطلب الآن
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </PageTransition>
  );
}

