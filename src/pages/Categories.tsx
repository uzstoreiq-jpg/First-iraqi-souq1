import { Link } from "react-router-dom";
import DotsLoader from "../components/DotsLoader";
import PageTransition from "../components/PageTransition";
import { useApi } from "../context/ApiContext";
import { Layers } from "lucide-react";
import { getCategoryIconComponent } from "../components/CategoryIcon";

export default function Categories() {
  const { categories, isLoadingCategories } = useApi();
  const displayCategories = categories.filter(c => c.id !== "all");

  return (
    <PageTransition>
      <div className="py-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[var(--color-secondary)] p-3 rounded-sm text-[var(--color-primary)]">
            <Layers className="w-6 h-6" strokeWidth={1.25} />
          </div>
          <h1 className="text-2xl font-black text-[#111827]">الأقسام</h1>
        </div>

        {isLoadingCategories ? (
          <div className="flex justify-center py-12">
            <DotsLoader className="text-[var(--color-primary)]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {displayCategories.map((category, index) => {
              const bgColors = [
                'bg-blue-50', 'bg-rose-50', 'bg-emerald-50', 'bg-amber-50', 
                'bg-purple-50', 'bg-cyan-50', 'bg-indigo-50', 'bg-orange-50'
              ];
              const textColors = [
                'text-blue-600', 'text-rose-600', 'text-emerald-600', 'text-amber-600',
                'text-purple-600', 'text-cyan-600', 'text-indigo-600', 'text-orange-600'
              ];
              const colorIndex = index % bgColors.length;
              
              return (
                <Link
                  key={category.name}
                  to={`/?category=${encodeURIComponent(category.name)}`}
                  className={`${bgColors[colorIndex]} p-6 rounded-3xl transition-all group flex flex-col items-center justify-center text-center gap-4 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative border-2 border-transparent hover:border-white/50`}
                >
                  <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 ${bgColors[colorIndex].replace('50', '200')} transition-transform group-hover:scale-150`}></div>
                  <div className={`w-20 h-20 rounded-2xl bg-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${textColors[colorIndex]} relative z-10`}>
                    {getCategoryIconComponent(category.name, "w-10 h-10", 1.5)}
                  </div>
                  <h3 className={`font-black text-lg ${textColors[colorIndex]} relative z-10 tracking-tight`}>
                    {category.name}
                  </h3>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
