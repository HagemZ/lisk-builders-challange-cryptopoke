import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Initialize on load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      let animationFrameId: number;

      const updatePosition = (e: MouseEvent) => {
        animationFrameId = requestAnimationFrame(() => {
          setPosition({ x: e.clientX, y: e.clientY });
        });
      };

      document.addEventListener('mousemove', updatePosition);

      return () => {
        document.removeEventListener('mousemove', updatePosition);
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      className="custom-cursor"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    />
  );
}
