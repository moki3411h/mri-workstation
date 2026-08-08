'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Bone,
  Brain,
  CheckCircle2,
  Gauge,
  GraduationCap,
  HeartPulse,
  Layers3,
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

const anatomyRegions = [
  {
    id: 'spine',
    label: 'SPINE MRI',
    title: 'Spine',
    description: 'Cervical, thoracic, lumbar, and whole-spine planning across sagittal and axial planes.',
    protocols: 'T1 · T2 · STIR · MYELO',
    plane: 'SAGITTAL',
    image: '/landing/anatomy/spine-mri.webp',
    alt: 'Sagittal lumbar spine MRI',
    icon: Bone,
  },
  {
    id: 'cardiac',
    label: 'CARDIAC MRI',
    title: 'Cardiac',
    description: 'Cine-oriented cardiac workflow for ventricular anatomy, function, and chamber planning.',
    protocols: 'CINE · MORPHOLOGY · FLOW',
    plane: 'AXIAL CINE',
    image: '/landing/anatomy/cardiac-mri.webp',
    alt: 'Animated axial cardiac MRI showing a beating heart',
    icon: HeartPulse,
    animated: true,
  },
  {
    id: 'abdomen',
    label: 'BODY MRI',
    title: 'Abdomen',
    description: 'Coverage for liver, pancreas, biliary, renal, and general abdominal examinations.',
    protocols: 'T1 · T2 · DWI · MRCP',
    plane: 'CORONAL',
    image: '/landing/anatomy/abdomen-mri.webp',
    alt: 'Coronal abdominal MRI with liver and abdominal organs visible',
    icon: ScanLine,
  },
  {
    id: 'pelvis',
    label: 'PELVIC MRI',
    title: 'Pelvis',
    description: 'Multi-planar pelvic planning with high-resolution T2 and diffusion workflows.',
    protocols: 'T1 · T2 · DWI · DYNAMIC',
    plane: 'SAGITTAL',
    image: '/landing/anatomy/pelvis-mri.webp',
    alt: 'Sagittal pelvic MRI',
    icon: ScanLine,
  },
  {
    id: 'msk',
    label: 'MSK MRI',
    title: 'Musculoskeletal',
    description: 'Joint-focused protocols for knee, shoulder, hip, ankle, wrist, and extremities.',
    protocols: 'PD · T1 · T2 · FAT SAT',
    plane: 'SAGITTAL',
    image: '/landing/anatomy/knee-mri.webp',
    alt: 'Sagittal knee MRI',
    icon: Bone,
  },
  {
    id: 'brain',
    label: 'NEURO MRI',
    title: 'Brain',
    description: 'Routine, vascular, diffusion, susceptibility, post-contrast, and 3D neuro workflows.',
    protocols: 'T1 · T2 · FLAIR · DWI · SWI',
    plane: 'AXIAL',
    image: '/protocol-series/t2-tra/frame-012.webp',
    alt: 'Axial T2-weighted brain MRI',
    icon: Brain,
  },
] as const;

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
    const images = Array<HTMLImageElement>(FRAME_COUNT);
    const loaded = new Set<number>();
    imagesRef.current = images;

    const loadFrame = (index: number) => new Promise<void>((resolve) => {
      if (cancelled || loaded.has(index)) {
        resolve();
        return;
      }

      const image = new window.Image();
      image.decoding = 'async';
      if (index === 0) image.fetchPriority = 'high';

      const finish = () => {
        image.onload = null;
        image.onerror = null;
        if (!cancelled) {
          images[index] = image;
          loaded.add(index);
        }
        resolve();
      };

      image.onload = finish;
      image.onerror = finish;
      image.src = `${FRAME_PREFIX}${padZero(index + 1)}${FRAME_EXT}`;
    });

    const loadPool = async (indices: number[], concurrency: number) => {
      let cursor = 0;
      const workers = Array.from({ length: concurrency }, async () => {
        while (!cancelled && cursor < indices.length) {
          const index = indices[cursor];
          cursor += 1;
          await loadFrame(index);
        }
      });
      await Promise.all(workers);
    };

    const waitForIdle = () => new Promise<void>((resolve) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => resolve(), { timeout: 500 });
      } else {
        setTimeout(resolve, 100);
      }
    });

    const preloadSequence = async () => {
      await loadFrame(0);
      if (cancelled) return;
      setFirstFrameReady(true);

      const milestoneFrames = Array.from(
        new Set([...Array.from({ length: 10 }, (_, index) => index * 30), FRAME_COUNT - 1]),
      ).filter((index) => index > 0 && index < FRAME_COUNT);
      await loadPool(milestoneFrames, 6);
      await waitForIdle();

      const keyFrames = Array.from({ length: Math.ceil(FRAME_COUNT / 6) }, (_, index) => index * 6)
        .filter((index) => index < FRAME_COUNT && !loaded.has(index));
      await loadPool(keyFrames, 8);
      await waitForIdle();

      const remainingFrames = Array.from({ length: FRAME_COUNT }, (_, index) => index)
        .filter((index) => !loaded.has(index));
      await loadPool(remainingFrames, 6);
    };

    void preloadSequence();

    return () => {
      cancelled = true;
      images.filter(Boolean).forEach((image) => {
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
      const imageRatio = image.naturalWidth / image.naturalHeight;
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

    let renderAnimationFrame = 0;
    let resizeAnimationFrame = 0;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.min(Math.floor(bounds.width * pixelRatio), 2560);
      canvas.height = Math.min(Math.floor(bounds.height * pixelRatio), 1440);
      renderFrame(frame.current);
    };

    const queueRender = () => {
      if (renderAnimationFrame) return;
      renderAnimationFrame = window.requestAnimationFrame(() => {
        renderAnimationFrame = 0;
        renderFrame(frame.current);
      });
    };

    const handleResize = () => {
      window.cancelAnimationFrame(resizeAnimationFrame);
      resizeAnimationFrame = window.requestAnimationFrame(resizeCanvas);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    resizeCanvas();

    const animation = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('[data-story-panel]');
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sceneRef.current,
          start: 'top top',
          end: '+=5200',
          scrub: 0.42,
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
          onUpdate: queueRender,
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
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(renderAnimationFrame);
      window.cancelAnimationFrame(resizeAnimationFrame);
      animation.revert();
    };
  }, [firstFrameReady]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add(styles.revealVisible));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.revealVisible);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="#top" className={styles.brand} aria-label="MRI Pro Workstation home">
          <Image src="/logo-icon.png" alt="" width={34} height={34} preload />
          <span>
            <strong>MRI PRO</strong>
            <small>WORKSTATION</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Landing page navigation">
          <Link href="#platform">Platform</Link>
          <Link href="#anatomy">Anatomy</Link>
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
              regional protocols, and image review into one clinically familiar learning environment—from
              neuro and spine to cardiac, body, pelvis, and musculoskeletal MRI.
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
        <span>REGIONAL PROTOCOLS</span><i />
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

      <section id="anatomy" className={`${styles.section} ${styles.anatomySection}`}>
        <div className={styles.anatomyIntro}>
          <div>
            <span className={styles.sectionLabel}>WHOLE-BODY MRI WORKFLOWS</span>
            <h2>Beyond neuro. Explore MRI across the body.</h2>
          </div>
          <p>
            Move between regional exam families while learning how anatomy, coil selection,
            planning planes, sequence weighting, and motion requirements change from one study to the next.
          </p>
        </div>

        <div className={styles.regionGrid}>
          {anatomyRegions.map((region) => {
            const RegionIcon = region.icon;
            return (
              <article
                key={region.id}
                className={`${styles.regionCard} ${styles.reveal}`}
                data-region={region.id}
                data-reveal
              >
                <div className={styles.regionMedia}>
                  <Image
                    src={region.image}
                    alt={region.alt}
                    fill
                    sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
                    loading="lazy"
                    unoptimized={'animated' in region && region.animated}
                  />
                  <div className={styles.regionScrim} aria-hidden="true" />
                </div>

                <div className={styles.regionTopline}>
                  <span><RegionIcon size={15} aria-hidden="true" /> {region.label}</span>
                  <em>{region.plane}</em>
                </div>

                <div className={styles.regionContent}>
                  <h3>{region.title}</h3>
                  <p>{region.description}</p>
                  <span className={styles.regionProtocols}>{region.protocols}</span>
                </div>
              </article>
            );
          })}
        </div>

        <p className={styles.anatomyNote}>
          Educational reference imagery · Regional availability in the simulator varies by protocol family
        </p>
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
            <div className={styles.orbitCenter}><ScanLine size={42} /></div>
            <span className={styles.orbitOne}><Brain size={18} /></span>
            <span className={styles.orbitTwo}><HeartPulse size={18} /></span>
            <span className={styles.orbitThree}><Bone size={18} /></span>
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
            <li><Activity size={18} /> Brain, spine, cardiac, body, pelvis, and MSK learning coverage</li>
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
        <details className={styles.imageCredits}>
          <summary>Reference image credits</summary>
          <p>
            <a href="https://commons.wikimedia.org/wiki/File:SAGITTAL-FSE_T1_MRI.jpg" target="_blank" rel="noreferrer">Spine MRI — Ptrump16, CC BY-SA 4.0</a>
            <a href="https://commons.wikimedia.org/wiki/File:Beating_Heart_axial.gif" target="_blank" rel="noreferrer">Cardiac cine MRI — G.D. Clarke, public domain</a>
            <a href="https://commons.wikimedia.org/wiki/File:MRI_of_torso.jpg" target="_blank" rel="noreferrer">Abdominal MRI — Filippo antinori1223, CC BY-SA 4.0</a>
            <a href="https://commons.wikimedia.org/wiki/File:Pelvic_MRI_125131.png" target="_blank" rel="noreferrer">Pelvic MRI — Nevit Dilmen, CC BY-SA 3.0</a>
            <a href="https://commons.wikimedia.org/wiki/File:Knee_MRI_T1_TSE_Sagittal.jpg" target="_blank" rel="noreferrer">Knee MRI — Ptrump16, CC BY-SA 4.0</a>
          </p>
          <small>Reference files were converted to WebP and receive a tonal treatment in the interface.</small>
        </details>
      </footer>
    </main>
  );
}
