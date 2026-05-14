import { useEffect, useRef } from 'react';

export function useGradient() {
  const requestRef = useRef();
  
  useEffect(() => {
    let tx1 = 50, ty1 = 50;  // target position for orb1
    let cx1 = 50, cy1 = 50;  // current interpolated position
    let cx2 = 50, cy2 = 50;  // current interpolated position for orb2

    const handleMouseMove = (e) => {
      tx1 = (e.clientX / window.innerWidth) * 100;
      ty1 = (e.clientY / window.innerHeight) * 100;
    };

    document.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      // Orb 1: follows cursor, 8% lerp per frame
      cx1 += (tx1 - cx1) * 0.08;
      cy1 += (ty1 - cy1) * 0.08;
      
      // Orb 2: inverse follow, creates tension
      cx2 += (100 - tx1 - cx2) * 0.04;
      cy2 += (100 - ty1 - cy2) * 0.04;

      document.documentElement.style.setProperty('--cx1', cx1 + '%');
      document.documentElement.style.setProperty('--cy1', cy1 + '%');
      document.documentElement.style.setProperty('--cx2', cx2 + '%');
      document.documentElement.style.setProperty('--cy2', cy2 + '%');
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);
}
