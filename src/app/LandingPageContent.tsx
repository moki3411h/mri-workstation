'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Brain,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Layers3,
  Monitor,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './LandingPageContent.module.css';

const FRAME_COUNT = 300;
const FRAME_PREFIX = '/landing/frames/ezgif-frame-';
const FRAME_EXT = '.jpg';

const workflowSteps = [
  ['01', 'Register', 'Create a patient and review the MRI safety checklist.'],
  ['02', 'Select', 'Choose a clinically familiar protocol and sequence queue.'],
  ['03', 'Plan', 'Prescribe the FoV once and see every projection update.'],
  ['04', 'Simulate', 'Run the exam and observe timing, SAR, RF, and progress.'],
];

function padZero(value: number, size = 3) {
  return String(value).padStart(size, '0');
}

export default function LandingPageContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    let cancelled = false;
    let readySignalled = false;
    const images: HTMLImageElement[] = [];

    const markReady = () => {
      if (!cancelled && !readySignalled) {
        readySignalled = true;
        setFirstFrameReady(true);
      }
    };

    for (let index = 1; index <= FRAME_COUNT; index += 1) {
      const image = new window.Image();
      image.decoding = 'async';
      image.onload = markReady;
      image.onerror = index === 1 ? markReady : null;
      image.src = `${FRAME_PREFIX}${padZero(index)}${FRAME_EXT}`;
      images.push(image);
    }

    imagesRef.current = images;

    return () => {
      cancelled = true;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (!firstFrameReady || !canvasRef.current || !sceneRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const frame = { current: 1 };

    const getRenderableImage = (requestedIndex: number) => {
      const target = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(requestedIndex) - 1));
      const exact = imagesRef.current[target];
      if (exact?.complete && exact.naturalWidth > 0) return exact;

      for (let offset = 1; offset < FRAME_COUNT; offset += 1) {
        const previous = imagesRef.current[target - offset];
        if (previous?.complete && previous.naturalWidth > 0) return previous;
        const next = imagesRef.current[target + offset];
        if (next?.complete && next.naturalWidth > 0) return next;
      }

      return null;
    };

    const renderFrame = (index: number) => {
      const image = getRenderableImage(index);
      if (!image) return;

      const canvasRatio = canvas.width / canvas.height;
      const imageRatio = image.width / image.height;
      let width = canvas.width;
      let height = canvas.height;
      let x = 0;
      let y = 0;

      if (imageRatio > canvasRatio) {
        width = canvas.height * imageRatio;
        x = (canvas.width - width) / 2;
      } else {
        height = canvas.width / imageRatio;
        y = (canvas.height - height) / 2;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, x, y, width, height);
    };

    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * pixelRatio);
      canvas.height = Math.floor(window.innerHeight * pixelRatio);
      renderFrame(frame.current);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const animation = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('[data-story-panel]');
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sceneRef.current,
          start: 'top top',
          end: '+=5200',
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      timeline.to(
        frame,
        {
          current: FRAME_COUNT,
          duration: 6,
          ease: 'none',
          snap: 'current',
          onUpdate: () => renderFrame(frame.current),
        },
        0,
      );

      panels.forEach((panel, index) => {
        const enterAt = Math.max(0, index * 1.45 - 0.25);
        if (index > 0) {
          timeline.fromTo(
            panel,
            { autoAlpha: 0, y: 46 },
            { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out' },
            enterAt,
          );
        }

        if (index < panels.length - 1) {
          timeline.to(
            panel,
            { autoAlpha: 0, y: -34, duration: 0.3, ease: 'power2.in' },
            enterAt + 1.08,
          );
        }
      });
    }, sceneRef);

    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      animation.revert();
    };
  }, [firstFrameReady]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="#top" className={styles.brand} aria-label="MRI Pro Workstation home">
          <Image src="/logo-icon.png" alt="" width={34} height={34} priority />
          <span>
            <strong>MRI PRO</strong>
            <small>WORKSTATION</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Landing page navigation">
          <Link href="#platform">Platform</Link>
          <Link href="#workflow">Workflow</Link>
          <Link href="#education">Education</Link>
        </nav>

        <Link href="/workstation" className={styles.headerCta}>
          Launch workstation
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      <section id="top" ref={sceneRef} className={styles.scene} aria-label="MRI Pro product introduction">
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.sceneShade} aria-hidden="true" />
        <div className={styles.scanGrid} aria-hidden="true" />

        {!firstFrameReady && (
          <div className={styles.loader} role="status">
            <span /> Preparing MRI sequence
          </div>
        )}

        <div className={styles.storyLayer}>
          <article className={`${styles.storyPanel} ${styles.heroPanel}`} data-story-panel>
            <div className={styles.eyebrow}>
              <Sparkles size={14} aria-hidden="true" />
              Educational MRI simulation platform
            </div>
            <h1>
              Plan the scan.
              <span>Understand the signal.</span>
            </h1>
            <p className={styles.heroCopy}>
              A browser-based MRI workstation that brings slice planning, acquisition physics,
              protocol workflow, and image review into one clinically familiar learning environment.
            </p>
            <div className={styles.heroActions}>
              <Link href="/workstation" className={styles.primaryButton}>
                Start workstation
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="#platform" className={styles.secondaryButton}>
                Explore the platform
              </Link>
            </div>
            <div className={styles.heroSignals} aria-label="Platform highlights">
              <span><CheckCircle2 size={14} /> Three synchronized views</span>
              <span><CheckCircle2 size={14} /> Real-time planning geometry</span>
              <span><ShieldCheck size={14} /> Educational use only</span>
            </div>
          </article>

          <article className={`${styles.storyPanel} ${styles.storyPanelRight}`} data-story-panel>
            <div className={styles.storyCard}>
              <span className={styles.storyIndex}>01 / PRESCRIPTION</span>
              <Layers3 className={styles.storyIcon} size={28} aria-hidden="true" />
              <h2>One geometry.<br />Three synchronized views.</h2>
              <p>
                Prescribe a single 3D planning object and see its axial, coronal, and sagittal
                projections respond together—with FoV, thickness, gap, and rotation kept precise.
              </p>
              <div className={styles.dataRow}>
                <span>TRA <strong>ACTIVE</strong></span>
                <span>COR <strong>SYNC</strong></span>
                <span>SAG <strong>SYNC</strong></span>
              </div>
            </div>
          </article>

          <article className={`${styles.storyPanel} ${styles.storyPanelLeft}`} data-story-panel>
            <div className={styles.storyCard}>
              <span className={styles.storyIndex}>02 / ACQUISITION</span>
              <Activity className={styles.storyIcon} size={28} aria-hidden="true" />
              <h2>Tune parameters.<br />Watch the exam respond.</h2>
              <p>
                Adjust sequence timing and geometry while the simulator updates scan time,
                signal behavior, SAR, and protocol progress in a coherent learning loop.
              </p>
              <div className={styles.parameterGrid}>
                <span><small>TR</small><strong>2000 ms</strong></span>
                <span><small>TE</small><strong>9 ms</strong></span>
                <span><small>FoV</small><strong>220 mm</strong></span>
                <span><small>Slice</small><strong>4.0 mm</strong></span>
              </div>
            </div>
          </article>

          <article className={`${styles.storyPanel} ${styles.finalStoryPanel}`} data-story-panel>
            <div className={styles.finalStoryContent}>
              <span className={styles.storyIndex}>03 / LEARNING WORKFLOW</span>
              <h2>From patient registration<br />to the completed scan.</h2>
              <p>
                Practice the complete flow—not just image viewing—in an environment designed
                for students, technologists, educators, and portfolio demonstration.
              </p>
              <Link href="/workstation" className={styles.primaryButton}>
                Enter MRI Pro
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>

        <div className={styles.scrollHint} aria-hidden="true">
          <ArrowDown size={14} /> Scroll to explore
        </div>
        <div className={styles.sceneRail} aria-hidden="true"><span /></div>
      </section>

      <div className={styles.capabilityStrip} aria-label="Supported capabilities">
        <span>3D PLANNING</span><i />
        <span>MULTI-PLANAR VIEWING</span><i />
        <span>SCAN PHYSICS</span><i />
        <span>PROTOCOL QUEUE</span><i />
        <span>DICOM WORKFLOW</span>
      </div>

      <section id="platform" className={styles.section}>
        <div className={styles.sectionIntro}>
          <div>
            <span className={styles.sectionLabel}>THE PLATFORM</span>
            <h2>A complete MRI learning environment, built around the real workflow.</h2>
          </div>
          <p>
            MRI Pro connects planning, image interaction, sequence simulation, and physics
            feedback so every action has context. The result feels like a workstation—not a slide deck.
          </p>
        </div>

        <div className={styles.featureGrid}>
          <article className={`${styles.featureCard} ${styles.featureCardLarge}`}>
            <div className={styles.featureImage}>
              <Image src="/mri_axial.png" alt="Axial MRI planning view" fill sizes="(max-width: 900px) 100vw, 60vw" />
              <div className={styles.planningOverlay} aria-hidden="true">
                <span className={styles.crosshairHorizontal} />
                <span className={styles.crosshairVertical} />
                <span className={styles.fovBox} />
              </div>
            </div>
            <div className={styles.featureContent}>
              <span>PLANNING ENGINE</span>
              <h3>Prescribe slices with confidence.</h3>
              <p>Move, rotate, and resize one FoV while synchronized projections update across all three planes.</p>
            </div>
          </article>

          <article className={`${styles.featureCard} ${styles.physicsCard}`}>
            <div className={styles.iconBox}><Gauge size={24} /></div>
            <span>LIVE PHYSICS</span>
            <h3>Parameters that explain themselves.</h3>
            <p>See how TR, TE, flip angle, bandwidth, FoV, and slice geometry influence the simulated exam.</p>
            <div className={styles.meterGroup} aria-hidden="true">
              <div><small>SNR</small><span><i style={{ width: '78%' }} /></span><b>HIGH</b></div>
              <div><small>SAR</small><span><i style={{ width: '32%' }} /></span><b>12%</b></div>
              <div><small>RF</small><span><i style={{ width: '56%' }} /></span><b>READY</b></div>
            </div>
          </article>

          <article className={`${styles.featureCard} ${styles.viewerCard}`}>
            <div className={styles.viewerImages} aria-hidden="true">
              <Image src="/mri_coronal.jpg" alt="" width={220} height={220} />
              <Image src="/mri_sagittal.jpg" alt="" width={220} height={220} />
            </div>
            <div className={styles.featureContent}>
              <span>MULTI-PLANAR VIEWER</span>
              <h3>See anatomy from every plane.</h3>
              <p>Review synchronized axial, coronal, and sagittal views with familiar viewer tools.</p>
            </div>
          </article>

          <article className={`${styles.featureCard} ${styles.queueCard}`}>
            <div className={styles.iconBox}><TimerReset size={24} /></div>
            <span>SCAN ENGINE</span>
            <h3>Build and run the complete exam.</h3>
            <p>Queue sequences, follow progress, and observe acquisition status as the simulated scan advances.</p>
            <div className={styles.sequenceList} aria-hidden="true">
              <div><b>01</b><span>Scout 3-plane</span><em>ACTIVE</em></div>
              <div><b>02</b><span>T1 SAG DFP</span><em>WAIT</em></div>
              <div><b>03</b><span>T2 COR</span><em>WAIT</em></div>
              <div><b>04</b><span>FLAIR TRA</span><em>WAIT</em></div>
            </div>
          </article>
        </div>
      </section>

      <section id="workflow" className={`${styles.section} ${styles.workflowSection}`}>
        <div className={styles.workflowHeading}>
          <span className={styles.sectionLabel}>CLINICALLY FAMILIAR FLOW</span>
          <h2>One continuous path through the exam.</h2>
          <p>Every module is connected so learners understand not only what to click, but why each decision matters.</p>
        </div>

        <div className={styles.workflowGrid}>
          {workflowSteps.map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <ArrowRight size={17} aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section id="education" className={`${styles.section} ${styles.educationSection}`}>
        <div className={styles.educationVisual}>
          <div className={styles.orbit} aria-hidden="true">
            <div className={styles.orbitCenter}><Brain size={42} /></div>
            <span className={styles.orbitOne}><ScanLine size={18} /></span>
            <span className={styles.orbitTwo}><Monitor size={18} /></span>
            <span className={styles.orbitThree}><Activity size={18} /></span>
          </div>
        </div>
        <div className={styles.educationCopy}>
          <span className={styles.sectionLabel}>BUILT FOR EDUCATION</span>
          <h2>Professional enough to immerse. Safe enough to explore.</h2>
          <p>
            MRI Pro is an educational simulator. It provides clinically familiar interactions and
            simulated feedback without offering diagnosis, treatment guidance, or scanner control.
          </p>
          <ul>
            <li><GraduationCap size={18} /> Guided learning panels and contextual explanations</li>
            <li><ShieldCheck size={18} /> Clearly separated from clinical decision-making</li>
            <li><Activity size={18} /> Responsive, hands-on exploration of MRI concepts</li>
          </ul>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} aria-hidden="true" />
        <Image src="/logo-icon.png" alt="" width={64} height={64} />
        <span>PLAN · SCAN · LEARN</span>
        <h2>Ready to enter the workstation?</h2>
        <p>Launch the complete MRI Pro simulation directly in your browser.</p>
        <Link href="/workstation" className={styles.primaryButton}>
          Start workstation
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/logo-icon.png" alt="" width={28} height={28} />
          <strong>MRI PRO WORKSTATION</strong>
        </div>
        <p>Browser-based educational MRI simulation. Not for clinical use.</p>
        <div className={styles.footerCredit}>
          <small>Developed by</small>
          <strong>P. MOKESH</strong>
        </div>
      </footer>
    </main>
  );
}
