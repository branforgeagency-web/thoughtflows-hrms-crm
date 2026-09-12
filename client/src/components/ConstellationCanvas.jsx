import React, { useEffect, useRef } from 'react';

export default function ConstellationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle nodes for subtle ambient network
    const particleCount = 28;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 2 + 1.2,
        opacity: Math.random() * 0.4 + 0.15
      });
    }

    const drawCurves = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Draw bottom-right flowing constellation wireframe matching the reference image
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.2;

      // Curved flowing line 1
      ctx.beginPath();
      ctx.moveTo(w * 0.75, h * 0.95);
      ctx.bezierCurveTo(w * 0.82, h * 0.82, w * 0.88, h * 0.92, w * 0.98, h * 0.78);
      ctx.stroke();

      // Curved flowing line 2
      ctx.beginPath();
      ctx.moveTo(w * 0.70, h * 0.85);
      ctx.bezierCurveTo(w * 0.78, h * 0.70, w * 0.85, h * 0.74, w * 0.94, h * 0.86);
      ctx.stroke();

      // Curved flowing line 3
      ctx.beginPath();
      ctx.moveTo(w * 0.82, h * 0.76);
      ctx.bezierCurveTo(w * 0.87, h * 0.68, w * 0.92, h * 0.72, w * 0.96, h * 0.79);
      ctx.stroke();

      // Anchor dots on the bottom right curve network
      const anchorPoints = [
        { x: w * 0.75, y: h * 0.95 },
        { x: w * 0.85, y: h * 0.79 },
        { x: w * 0.90, y: h * 0.95 },
        { x: w * 0.92, y: h * 0.74 },
        { x: w * 0.98, y: h * 0.78 },
      ];

      anchorPoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();
      });

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle dynamic particles and faint connecting lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 243, 208, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(204, 251, 241, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      drawCurves();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
}
