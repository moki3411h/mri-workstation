'use client';
import { useEffect, useRef } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function ThreeDViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef  = useRef<OrbitControls | null>(null);
  const planesRef    = useRef<{ cor: THREE.Mesh; sag: THREE.Mesh; tra: THREE.Mesh } | null>(null);
  const rafRef       = useRef<number>(0);
  const { slice }    = useWorkstationStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth, H = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x04060a, 1);
    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
    camera.position.set(0, 1.5, 2.8);
    cameraRef.current = camera;

    // Lights
    scene.add(new THREE.AmbientLight(0x8899bb, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x3344aa, 0.3);
    fillLight.position.set(-2, -1, -2);
    scene.add(fillLight);

    // Procedural brain texture
    const texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = 256;
    const tctx = texCanvas.getContext('2d')!;
    tctx.fillStyle = '#2a3848'; tctx.fillRect(0,0,256,256);
    for (let i = 0; i < 120; i++) {
      const x = Math.random()*256, y = Math.random()*256, r = 4 + Math.random()*20;
      const g = tctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0, `rgba(${50+Math.random()*30},${65+Math.random()*30},${85+Math.random()*25},0.8)`);
      g.addColorStop(1, 'transparent');
      tctx.fillStyle = g; tctx.beginPath(); tctx.arc(x,y,r,0,Math.PI*2); tctx.fill();
    }
    // Add gyri-like lines
    tctx.strokeStyle = 'rgba(100,120,150,0.3)'; tctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      tctx.beginPath();
      tctx.moveTo(Math.random()*256, Math.random()*256);
      tctx.bezierCurveTo(Math.random()*256,Math.random()*256,Math.random()*256,Math.random()*256,Math.random()*256,Math.random()*256);
      tctx.stroke();
    }
    const brainTexture = new THREE.CanvasTexture(texCanvas);

    // Brain sphere
    const brainGeo = new THREE.SphereGeometry(0.85, 64, 48);
    const brainMat = new THREE.MeshStandardMaterial({
      map: brainTexture, roughness: 0.85, metalness: 0.05,
      color: new THREE.Color(0x445566), transparent: true, opacity: 0.92,
    });
    const brain = new THREE.Mesh(brainGeo, brainMat);
    scene.add(brain);

    // Brain outline
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.1, side: THREE.BackSide });
    const outline = new THREE.Mesh(new THREE.SphereGeometry(0.88, 32, 32), outlineMat);
    scene.add(outline);

    // MPR cutting planes
    const makePlane = (color: number, rot?: THREE.Euler) => {
      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      if (rot) mesh.rotation.copy(rot);
      scene.add(mesh);
      // Add border line
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
      const line = new THREE.LineSegments(edges, lineMat);
      if (rot) line.rotation.copy(rot);
      mesh.add(line);
      return mesh;
    };
    const corPlane = makePlane(0xffe040, new THREE.Euler(0, 0, 0));
    const sagPlane = makePlane(0x60d0ff, new THREE.Euler(0, Math.PI/2, 0));
    const traPlane = makePlane(0x60ffa0, new THREE.Euler(Math.PI/2, 0, 0));
    planesRef.current = { cor: corPlane, sag: sagPlane, tra: traPlane };

    // Coordinate axes
    const axesHelper = new THREE.AxesHelper(1.2);
    scene.add(axesHelper);

    // Orbit controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8;
    controls.minDistance = 1.5; controls.maxDistance = 5;
    controlsRef.current = controls;

    // Animate
    let running = true;
    const animate = () => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      // Update plane positions from slice
      const { slice: sl } = useWorkstationStore.getState();
      const corT = (sl.coronal.cur / sl.coronal.max - 0.5) * 1.4;
      const sagT = (sl.sagittal.cur / sl.sagittal.max - 0.5) * 1.4;
      const traT = (sl.axial.cur / sl.axial.max - 0.5) * 1.4;
      corPlane.position.z = corT;
      sagPlane.position.x = sagT;
      traPlane.position.y = -traT;
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const W2 = container.clientWidth, H2 = container.clientHeight;
      renderer.setSize(W2, H2);
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const setCamera = (pos: THREE.Vector3Tuple) => {
    cameraRef.current?.position.set(...pos);
    controlsRef.current?.update();
  };

  return (
    <div ref={containerRef} style={{ width:'100%', height:'100%', position:'relative', background:'#04060a', overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }} />

      {/* Label */}
      <div className="vp-label-tl" style={{ top:'5px', left:'6px' }}>
        <span className="plane-badge plane-3d" style={{ fontSize:'10px', fontWeight:700, padding:'1px 6px', background:'rgba(0,0,0,0.65)', letterSpacing:'0.5px' }}>3D MPR</span>
      </div>

      {/* Toolbar */}
      <div style={{
        position:'absolute', bottom:'6px', left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:'4px', background:'rgba(0,0,0,0.7)',
        border:'1px solid #1e293b', borderRadius:'2px', padding:'3px 6px',
      }}>
        {[
          ['AX',  ()=>setCamera([0, 3, 0])],
          ['COR', ()=>setCamera([0, 0, 3])],
          ['SAG', ()=>setCamera([3, 0, 0])],
          ['↺',   ()=>setCamera([0, 1.5, 2.8])],
          ['📷',  ()=>{
            const c = canvasRef.current;
            if (!c) return;
            const link = document.createElement('a');
            link.href = c.toDataURL('image/png');
            link.download = 'mri-3d.png';
            link.click();
            toast('Screenshot saved', 'success');
          }],
        ].map(([label, fn]) => (
          <button key={label as string} onClick={fn as ()=>void}
            style={{ fontSize:'8.5px', background:'#1c2a3e', border:'1px solid #263040', color:'#64748b', padding:'2px 6px', cursor:'pointer', borderRadius:'2px', transition:'all 0.1s' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#22d3ee';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#64748b';}}
          >
            {label as string}
          </button>
        ))}
      </div>
    </div>
  );
}
