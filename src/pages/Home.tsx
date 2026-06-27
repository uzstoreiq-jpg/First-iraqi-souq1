import { Link, useLocation } from "react-router-dom";
import DotsLoader from "../components/DotsLoader";
import { ChevronLeft, Trophy, Tag, Percent, Flame, Compass } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import PageTransition from "../components/PageTransition";
import { useApi } from "../context/ApiContext";
import { generateRandomRating } from "../utils/helpers";
import { getCategoryIconComponent } from "../components/CategoryIcon";

export default function Home() {
  const location = useLocation();
  const { categories, products, isLoadingCategories, isLoadingProducts, fetchProducts } = useApi();
  const [activeCategoryId, setActiveCategoryId] = useState<string | number>("all");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get("category");
    if (categoryParam && categories.length > 0) {
      const found = categories.find(c => c.name === categoryParam || c.id.toString() === categoryParam);
      if (found) {
        setActiveCategoryId(found.id);
      }
    } else if (!categoryParam) {
      setActiveCategoryId("all");
    }
  }, [location.search, categories]);

  useEffect(() => {
    fetchProducts(activeCategoryId);
  }, [activeCategoryId]);

  // Retrieve offers
  const offerProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Preserve the exact same order from API
    return products.map((product) => {
      if (product.oldPrice && product.oldPrice > product.price) {
        return product;
      }
      // Add fake offers for visual appeal
      const discountPercentage = 10 + ((Number(product.id) * 7) % 30);
      const newOldPrice = Math.round(product.price * (1 + (discountPercentage / 100)));
      
      return {
        ...product,
        oldPrice: newOldPrice
      };
    });
  }, [products]);

  return (
    <PageTransition>
      <div className="space-y-6 pb-6">
        {/* Categories Horizontal Scroll */}
        <section className="relative -mx-4 px-4 md:mx-0 md:px-0">
          {isLoadingCategories ? (
            <div className="flex justify-center py-4">
              <DotsLoader className="text-gray-400" />
            </div>
          ) : (
            <div className="flex overflow-x-auto hide-scrollbar gap-2 md:gap-3 pb-4 pt-3 px-3 md:px-1 snap-x select-none">
              {categories.map((category) => {
                const isActive = activeCategoryId === category.id;
                return (
                  <button
                    key={category.id + "-" + category.name}
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`snap-start px-2 pt-2 pb-2.5 md:px-3 md:pt-2.5 md:pb-3 rounded-2xl text-[10px] sm:text-[11px] md:text-xs font-medium md:font-semibold transition-all duration-300 flex flex-col items-center justify-start gap-1 w-[76px] sm:w-[84px] md:w-[96px] shrink-0 active:scale-95 cursor-pointer outline-none border ${
                      isActive
                        ? "bg-gradient-to-br from-[#FA7C23] to-[#F36B13] text-white border-transparent shadow-[0_4px_12px_rgba(249,115,22,0.12)] -translate-y-0.5"
                        : "bg-white text-zinc-550 hover:text-zinc-700 border-zinc-100/60 hover:border-zinc-200/50 hover:bg-zinc-50/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                    }`}
                  >
                    <span className={`w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                      isActive 
                        ? 'bg-white/18 text-white' 
                        : 'bg-zinc-100/60 text-[#F97316]'
                    }`}>
                      {getCategoryIconComponent(
                        activeCategoryId === "all" && category.id === "all" ? "الكل" : category.name, 
                        "w-4.5 h-4.5 md:w-5.5 md:h-5.5 shrink-0", 
                        1.5
                      )}
                    </span>
                    <span className="tracking-wide text-center leading-tight mt-0.5 line-clamp-2 h-7 sm:h-8 flex items-center justify-center break-words w-full px-0.5 font-medium antialiased text-zinc-800 dark:text-inherit select-none">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Products Grid */}
        <section>
          {isLoadingProducts ? (
            <div className="flex justify-center py-12">
              <DotsLoader className="text-[var(--color-primary)]" />
            </div>
          ) : offerProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              لا توجد منتجات في هذا القسم حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              {offerProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-white rounded-sm shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col relative"
                >
                  <div className="aspect-[4/5] overflow-hidden relative bg-gray-50 p-4">
                    <img
                      src={product.thumbnail || product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 mix-blend-multiply"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-sm md:text-base text-[#111827] mb-2 line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors">{product.name}</h3>
                    
                    <div className="mt-auto pt-3 border-t border-gray-50 flex flex-col">
                      {product.oldPrice && (
                        <span className="text-[11px] text-gray-400 line-through font-medium mb-0.5">
                          {product.oldPrice.toLocaleString()} د.ع
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-primary)] font-black text-lg md:text-xl leading-none">
                          {product.price.toLocaleString()} <span className="text-xs font-bold ml-1">د.ع</span>
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all text-[var(--color-primary)] shrink-0">
                          <ChevronLeft className="w-4 h-4" strokeWidth={1.25} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
