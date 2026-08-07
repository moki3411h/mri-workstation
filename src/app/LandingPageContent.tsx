'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';


const FRAME_COUNT = 300;
const FRAME_PREFIX = '/landing/frames/ezgif-frame-';
const FRAME_EXT = '.jpg';

function padZero(num: number, size = 3) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  // Keep images in a ref to avoid re-renders
  const imagesRef = useRef<HTMLImageElement[]>([]);
  
  useEffect(() => {
    // 1. Preload Images
    let loadedCount = 0;
    const imgs: HTMLImageElement[] = [];
    
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = `${FRAME_PREFIX}${padZero(i)}${FRAME_EXT}`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          setLoaded(true);
        }
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    if (!loaded || !canvasRef.current || !containerRef.current || !sectionsRef.current) return;

    const canvas = canvasRef.current;
    const ctxCanvas = canvas.getContext('2d');
    if (!ctxCanvas) return;

    // GSAP ScrollTrigger Sequence
    const frame = { current: 1 };

    // Handle Resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderFrame(frame.current);
    };

    const renderFrame = (index: number) => {
      const img = imagesRef.current[Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(index) - 1))];
      if (!img || !ctxCanvas) return;
      
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;
      
      let renderWidth = canvas.width;
      let renderHeight = canvas.height;
      let renderX = 0;
      let renderY = 0;

      if (imgRatio > canvasRatio) {
        renderWidth = canvas.height * imgRatio;
        renderX = (canvas.width - renderWidth) / 2;
      } else {
        renderHeight = canvas.width / imgRatio;
        renderY = (canvas.height - renderHeight) / 2;
      }

      ctxCanvas.clearRect(0, 0, canvas.width, canvas.height);
      ctxCanvas.drawImage(img, renderX, renderY, renderWidth, renderHeight);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // initial draw
    
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=4000',
          scrub: true,
          pin: true,
        },
      });

      tl.to(frame, {
        current: FRAME_COUNT,
        snap: 'current',
        ease: 'none',
        onUpdate: () => renderFrame(frame.current),
      });

      // Animate text sections independently using scroll
      const textSections = gsap.utils.toArray<HTMLElement>('.scroll-section');
      textSections.forEach((section, i) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            scrollTrigger: {
              trigger: section,
              start: 'top center+=200',
              end: 'center center',
              scrub: true,
            },
          }
        );
        
        if (i < textSections.length - 1) {
          gsap.to(section, {
            opacity: 0,
            y: -50,
            scrollTrigger: {
              trigger: section,
              start: 'center center',
              end: 'bottom center-=200',
              scrub: true,
            }
          });
        }
      });
    }, containerRef);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      ctx.revert();
    };
  }, [loaded]);

  return (
    <div className="bg-black text-white min-h-screen relative font-sans selection:bg-blue-500 selection:text-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Canvas Container Pinned via GSAP */}
      <div ref={containerRef} className="w-full h-screen overflow-hidden relative z-0">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-blue-400 font-semibold tracking-widest text-sm">
            INITIALIZING SYSTEM...
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="w-full h-full opacity-60 mix-blend-screen"
          style={{ 
            filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.3)) hue-rotate(190deg) saturate(1.5)',
          }}
        />
        {/* Subtle radial gradient overlay for premium depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* Content Below Hero */}
      <div ref={sectionsRef} className="relative z-10 w-full bg-black">
        
        {/* Sections for scrolling */}
        
        <section className="h-screen flex flex-col justify-center items-center text-center px-6">
          <div className="scroll-section">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              MRI Workstation Pro
            </h1>
            <p className="mt-6 text-xl md:text-3xl text-gray-400 max-w-2xl mx-auto font-light tracking-wide">
              The next generation of clinical imaging. Unprecedented clarity.
            </p>
          </div>
        </section>

        <section className="h-screen flex flex-col justify-center items-center text-center px-6">
          <div className="scroll-section">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              AI-assisted Planning
            </h2>
            <p className="text-xl md:text-2xl text-blue-300 max-w-3xl mx-auto font-light leading-relaxed">
              Automated slice positioning. intelligent protocol queuing. Millimeter precision driven by neural networks.
            </p>
          </div>
        </section>

        <section className="h-screen flex flex-col justify-center items-center text-center px-6">
          <div className="scroll-section">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
              Advanced Visualization
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
              Real-time multi-planar reconstruction. Fluid volumetric rendering powered by custom WebGL architecture.
            </p>
          </div>
        </section>

        <section className="h-screen flex flex-col justify-center items-center text-center px-6">
          <div className="scroll-section">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Clinical Workflow
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
              Designed for speed. Engineered for zero friction. Seamlessly integrates with your daily radiological routine.
            </p>
          </div>
        </section>

        <section className="h-screen flex flex-col justify-center items-center text-center px-6">
          <div className="scroll-section">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Research & Education
            </h2>
            <p className="text-xl md:text-2xl text-blue-200 max-w-2xl mx-auto font-light leading-relaxed">
              Simulate sequences. Understand physics in real-time. The ultimate interactive training tool for technologists.
            </p>
          </div>
        </section>

        <section className="h-screen flex flex-col justify-center items-center text-center px-6 pb-32">
          <div className="scroll-section">
            <h2 className="text-6xl md:text-8xl font-bold tracking-tighter mb-12">
              Ready to explore?
            </h2>
            <Link href="/workstation" className="group relative inline-flex items-center justify-center px-10 py-5 text-xl font-medium tracking-wide text-white transition-all duration-300 ease-out bg-blue-600 rounded-full hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]">
              Start Workstation
              <svg className="w-6 h-6 ml-3 transition-transform duration-300 ease-out group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
