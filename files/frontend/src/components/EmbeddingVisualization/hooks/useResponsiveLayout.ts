import { useState, useEffect } from 'react';

interface UseResponsiveLayoutReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  windowWidth: number;
  windowHeight: number;
  siderCollapsed: boolean;
  setSiderCollapsed: (collapsed: boolean) => void;
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1200;

export const useResponsiveLayout = (): UseResponsiveLayoutReturn => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    
    // Handle initial responsive state
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-collapse sidebars on tablet view
  useEffect(() => {
    if (windowWidth >= MOBILE_BREAKPOINT && windowWidth < TABLET_BREAKPOINT) {
      setSiderCollapsed(true);
    } else if (windowWidth >= TABLET_BREAKPOINT) {
      setSiderCollapsed(false);
    }
  }, [windowWidth]);

  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  const isTablet = windowWidth >= MOBILE_BREAKPOINT && windowWidth < TABLET_BREAKPOINT;
  const isDesktop = windowWidth >= TABLET_BREAKPOINT;

  return {
    isMobile,
    isTablet,
    isDesktop,
    windowWidth,
    windowHeight,
    siderCollapsed,
    setSiderCollapsed,
  };
};