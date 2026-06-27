/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Categories from "./pages/Categories";
import LatestProducts from "./pages/LatestProducts";
import BestSellers from "./pages/BestSellers";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import { useEffect, useLayoutEffect } from "react";
import { initMetaPixel, trackPageView } from "./utils/tracking";
import { ApiProvider } from "./context/ApiContext";
import { AnimatePresence } from "motion/react";

import Footer from "./components/Footer";

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  return (
    <>
      <AnimatePresence mode="wait">
        <div key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/latest" element={<LatestProducts />} />
            <Route path="/best-sellers" element={<BestSellers />} />
          </Routes>
        </div>
      </AnimatePresence>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith("/product/");
  const isSuccessPage = location.pathname === "/success";

  return (
    <div className="min-h-[100dvh] bg-white text-[#111827] font-sans" dir="rtl">
      {!isSuccessPage && <Navbar />}
      {isProductPage && (
        <div className="w-full bg-[#2C3947] border-b border-[#2C3947]/20 py-2 px-4 select-none flex items-center justify-center text-center shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
          <span className="text-white text-xs sm:text-[12.5px] font-medium tracking-wide leading-relaxed select-none flex flex-wrap items-center justify-center gap-2">
            <span>🔥</span>
            <span>توصيل سريع خلال يوم واحد لكل محافظات العراق</span>
            <span>🔥</span>
          </span>
        </div>
      )}
      <main className={`container mx-auto px-2 sm:px-4 max-w-5xl overflow-x-hidden ${isSuccessPage ? "p-0 max-w-full flex items-center justify-center" : "min-h-[calc(100vh-250px)]"} ${isProductPage ? "pt-0 pb-4 md:pt-3 md:pb-6" : isSuccessPage ? "p-0" : "py-4 md:py-6"}`}>
        <AnimatedRoutes />
      </main>
      {!isSuccessPage && <Footer />}
      {!isProductPage && !isSuccessPage && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Initialize Meta Pixel
    initMetaPixel();

    // Disable browser's automatic scroll restoration to avoid interference with React Router state navigation
    if (typeof window !== "undefined" && "history" in window && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <ApiProvider>
      <Router>
        <AppContent />
      </Router>
    </ApiProvider>
  );
}

