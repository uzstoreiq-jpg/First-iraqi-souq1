import { useLayoutEffect, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  const performReset = () => {
    // 1. Force scroll-behavior to 'auto' to prevent smooth scrolling transition lag
    const html = document.documentElement;
    const originalHtmlBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    
    let originalBodyBehavior = "";
    if (document.body) {
      originalBodyBehavior = document.body.style.scrollBehavior;
      document.body.style.scrollBehavior = "auto";
    }

    // 2. Clear native browser scroll restoration state if possible
    if (typeof window !== "undefined" && "history" in window && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // 3. Force scroll reset across all potential scrollable viewport elements
    window.scrollTo(0, 0);
    html.scrollTo(0, 0);
    if (document.body) {
      document.body.scrollTo(0, 0);
    }

    // Restore original scroll behavior safely after scroll event is dispatched
    setTimeout(() => {
      html.style.scrollBehavior = originalHtmlBehavior;
      if (document.body) {
        document.body.style.scrollBehavior = originalBodyBehavior;
      }
    }, 50);
  };

  // Phase A: Pre-repaint layout phase
  useLayoutEffect(() => {
    performReset();
  }, [pathname]);

  // Phase B: Post-repaint effect phase
  useEffect(() => {
    performReset();

    // Phase C: Asynchronous microtask & animation frame phases (Slamming any queued scroll restore)
    const handle = requestAnimationFrame(() => {
      performReset();
    });

    const timer = setTimeout(() => {
      performReset();
    }, 0);

    const timer2 = setTimeout(() => {
      performReset();
    }, 50);

    return () => {
      cancelAnimationFrame(handle);
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [pathname]);

  return null;
}


