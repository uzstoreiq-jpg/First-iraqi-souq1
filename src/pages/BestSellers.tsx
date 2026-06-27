import { Link } from "react-router-dom";
import DotsLoader from "../components/DotsLoader";
import { Trophy, TrendingUp, Star } from "lucide-react";
import { useEffect, useMemo } from "react";
import PageTransition from "../components/PageTransition";
import { useApi } from "../context/ApiContext";
import { generateRandomRating } from "../utils/helpers";

export default function BestSellers() {
  const { products, isLoadingProducts, fetchProducts } = useApi();

  useEffect(() => {
    // Fetch generic products to derive best sellers from
    fetchProducts();
  }, [fetchProducts]);

  // Derive best sellers: artificially sort based on ID or consistent logic
  const bestSellerProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Sort to make the best sellers consistent (e.g. products with highest rating numbers first)
    // We can use the generateRandomRating as a sort metric
    const sorted = [...products].sort((a, b) => {
      const ratingA = generateRandomRating(a.id);
      const ratingB = generateRandomRating(b.id);
      if (ratingA !== ratingB) return ratingB - ratingA;
      return Number(b.id) - Number(a.id);
    });

    return sorted.slice(0, 40); // Top 40 best sellers
  }, [products]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <section>
          {isLoadingProducts ? (
            <div className="flex justify-center py-12">
              <DotsLoader className="text-[var(--color-primary)]" />
            </div>
          ) : bestSellerProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              جاري تحديث قائمة الأكثر مبيعاً.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {bestSellerProducts.map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-white rounded-sm shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col relative"
                >
                  <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-amber-100">
                    <span className="text-amber-500 font-black text-xs">#{index + 1}</span>
                  </div>
                  
                  <div className="aspect-[4/5] overflow-hidden relative bg-gray-50 p-3">
                    <img
                      src={product.thumbnail || product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-grow">
                    <div className="flex items-center gap-0.5 mb-1.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.25} />
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.25} />
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.25} />
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.25} />
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.25} />
                      <span className="text-[10px] text-gray-400 mr-1">({generateRandomRating(product.id)})</span>
                    </div>
                    <h3 className="font-bold text-xs md:text-sm text-[#111827] mb-1 line-clamp-2 leading-snug">{product.name}</h3>
                    
                    <div className="mt-auto pt-2 flex items-end justify-between">
                      <div className="flex flex-col">
                        {product.oldPrice && (
                          <span className="text-[10px] text-gray-400 line-through font-medium">
                            {product.oldPrice.toLocaleString()} د.ع
                          </span>
                        )}
                        <span className="text-[var(--color-primary)] font-black text-base md:text-lg leading-none mt-0.5">
                          {product.price.toLocaleString()} د.ع
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors text-[#111827] border border-gray-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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
