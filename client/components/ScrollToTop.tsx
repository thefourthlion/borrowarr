"use client";

import { useEffect, useState } from "react";
import { Button } from "@nextui-org/button";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <Button
            isIconOnly
            className="w-12 h-12 rounded-full bg-secondary text-white shadow-lg shadow-secondary/40 hover:shadow-secondary/60 btn-glow backdrop-blur-md"
            onPress={scrollToTop}
            aria-label="Scroll to top"
          >
            <ArrowUp size={24} />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

