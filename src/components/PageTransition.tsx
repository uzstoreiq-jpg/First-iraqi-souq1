import { motion } from "motion/react";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}
