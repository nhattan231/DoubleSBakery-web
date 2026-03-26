'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Route changed — show loading bar briefly
      setLoading(true);
      setDone(false);
      prevPathname.current = pathname;

      // After a short delay, mark as done (page has rendered)
      const timer = setTimeout(() => {
        setDone(true);
        setTimeout(() => setLoading(false), 500);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  if (!loading) return null;

  return <div className={`route-loading-bar ${done ? 'done' : ''}`} />;
}
