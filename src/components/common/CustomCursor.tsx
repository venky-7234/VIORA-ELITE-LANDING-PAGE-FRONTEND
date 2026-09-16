import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useLocation } from "react-router-dom";

export const CustomCursor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const location = useLocation();

  const isDashboard = location.pathname.includes('/superadmin') || location.pathname.includes('/admin') || location.pathname.includes('/dashboard');

  const springConfig = { damping: 30, stiffness: 250, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Disable on non-pointer screens or dashboard routes
    const mediaQuery = window.matchMedia("(pointer: fine)");
    
    // Always clean up class first
    document.body.classList.remove('custom-cursor-active');
    
    if (!mediaQuery.matches || isDashboard) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    document.body.classList.add('custom-cursor-active');

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.body.classList.remove('custom-cursor-active');
    };
  }, [cursorX, cursorY, isDashboard]);

  if (!isVisible || isDashboard) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border border-[#D8AF45]/50 rounded-full pointer-events-none z-[9999] -ml-4 -mt-4"
        style={{ x: cursorXSpring, y: cursorYSpring }}
      />
      <motion.div
        className="fixed top-0 left-0 w-2.5 h-2.5 bg-gradient-to-r from-[#D8AF45] to-[#E8C96F] rounded-full pointer-events-none z-[9999] -ml-1.25 -mt-1.25 shadow-[0_0_10px_rgba(216,175,69,0.8)]"
        style={{ x: cursorX, y: cursorY }}
      />
    </>
  );
};
