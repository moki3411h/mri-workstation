'use client';
import { useEffect, useRef } from 'react';
import { useWorkstationStore, type Plane } from '@/store/workstationStore';
import { toast } from '@/lib/toast';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

    // Renderer (High Quality, Anti-aliased)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x04060a, 1);
    // PBR rendering
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(2.0, 1.5, 2.5); // Default: Front-right 30°, slightly elevated
    cameraRef.current = camera;

    // Soft Ambient + Subtle Rim Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2)); // Soft overall ambient
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(-2, 3, -3);
    scene.add(rimLight);
    const keyLight = new THREE.DirectionalLight(0xeef2ff, 1.5);
    keyLight.position.set(2, 2, 3);
    scene.add(keyLight);

    // Load Anatomical GLTF Model
    const loader = new GLTFLoader();
    loader.load('/models/head_anatomy.glb', (gltf) => {
      const model = gltf.scene;
      
      // Override materials for medical workstation look
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const name = mesh.name.toLowerCase();
          
          let color = 0xcccccc; // fallback
          let opacity = 1.0;
          let transparent = false;
          
          if (name.includes('skull') || name.includes('bone') || name.includes('cervical') || name.includes('vertebrae')) {
            color = 0xd4d4d8; // light grey bone
            opacity = 0.30;
            transparent = true;
          } else if (name.includes('brain') || name.includes('cerebrum') || name.includes('cerebellum')) {
            color = 0xfaf0e6; // light ivory/pale pink
          } else if (name.includes('nerve') || name.includes('optic')) {
            color = 0xfef08a; // soft yellow
          } else if (name.includes('spinal') || name.includes('cord') || name.includes('stem')) {
            color = 0xf8fafc; // off-white
          } else if (name.includes('ventricle')) {
            color = 0x38bdf8; // light blue for CSF
            opacity = 0.7;
            transparent = true;
          }

          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(color),
            roughness: 0.6,
            metalness: 0.1,
            transparent: transparent,
            opacity: opacity,
            depthWrite: !transparent, // Fix sorting issues for transparent objects
          });
        }
      });

      // Center model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);
    }, undefined, (err) => {
      console.warn("No 3D model found at /models/head_anatomy.glb. Skipping load.");
    });

    // MPR slice planes
    const makePlane = (color: number, rot?: THREE.Euler) => {
      const geo = new THREE.PlaneGeometry(2.2, 2.2);
      const mat = new THREE.MeshBasicMaterial({ 
        color, 
        transparent: true, 
        opacity: 0.35, // 35% as requested
        side: THREE.DoubleSide,
        depthWrite: false 
      });
      const mesh = new THREE.Mesh(geo, mat);
      if (rot) mesh.rotation.copy(rot);
      
      // Border line
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const line = new THREE.LineSegments(edges, lineMat);
      mesh.add(line);
      
      return mesh;
    };

    // Axial (Blue), Coronal (Green), Sagittal (Yellow)
    const traPlane = makePlane(0x60d0ff, new THREE.Euler(Math.PI/2, 0, 0)); // Axial = tra
    const corPlane = makePlane(0x60ffa0, new THREE.Euler(0, 0, 0)); // Coronal = cor
    const sagPlane = makePlane(0xffe040, new THREE.Euler(0, Math.PI/2, 0)); // Sagittal = sag
    
    scene.add(traPlane); scene.add(corPlane); scene.add(sagPlane);
    planesRef.current = { cor: corPlane, sag: sagPlane, tra: traPlane };

    // Glowing Crosshair
    const crosshairGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const crosshairMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const crosshair = new THREE.Mesh(crosshairGeo, crosshairMat);
    scene.add(crosshair);

    // Raycaster for Plane Dragging
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let draggedPlane: { mesh: THREE.Mesh; planeType: Plane; initialPos: number; startY: number } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left click drags
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Intersect planes
      const intersects = raycaster.intersectObjects([traPlane, corPlane, sagPlane], false);
      if (intersects.length > 0) {
        controls.enabled = false; // Disable orbit while dragging
        const hit = intersects[0].object as THREE.Mesh;
        let pType: Plane = 'axial';
        let initPos = hit.position.y;
        if (hit === corPlane) { pType = 'coronal'; initPos = hit.position.z; }
        if (hit === sagPlane) { pType = 'sagittal'; initPos = hit.position.x; }
        
        draggedPlane = { mesh: hit, planeType: pType, initialPos: initPos, startY: e.clientY };
        canvas.style.cursor = 'ns-resize';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggedPlane) return;
      const dy = e.clientY - draggedPlane.startY;
      // Simple 2D to 1D mapping for smooth drag
      const delta = -dy * 0.01; 
      const newPos = Math.max(-1.1, Math.min(1.1, draggedPlane.initialPos + delta));
      
      const { setSlice, slice: curSlice } = useWorkstationStore.getState();
      const p = draggedPlane.planeType;
      
      // Calculate equivalent cur/max for the store
      const normalized = (newPos / 1.4) + 0.5; // Reverse mapping from render loop
      const newCur = Math.round(normalized * curSlice[p].max);
      setSlice(p, Math.max(1, Math.min(curSlice[p].max, newCur)));
    };

    const onPointerUp = () => {
      draggedPlane = null;
      controls.enabled = true;
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Orbit controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8;
    controls.minDistance = 1.0; controls.maxDistance = 6;
    // Left click = rotate, Right click = pan
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controlsRef.current = controls;

    // Animate (60FPS loop)
    let running = true;
    const animate = () => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      
      // Sync planes with slice state continuously
      const { slice: sl } = useWorkstationStore.getState();
      const corT = (sl.coronal.cur / sl.coronal.max - 0.5) * 1.4;
      const sagT = (sl.sagittal.cur / sl.sagittal.max - 0.5) * 1.4;
      const traT = (sl.axial.cur / sl.axial.max - 0.5) * 1.4;
      
      corPlane.position.z = corT;
      sagPlane.position.x = sagT;
      traPlane.position.y = -traT;

      // Update crosshair intersection point
      crosshair.position.set(sagT, -traT, corT);

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
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
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const resetView = () => {
    cameraRef.current?.position.set(2.0, 1.5, 2.5);
    controlsRef.current?.target.set(0,0,0);
    controlsRef.current?.update();
  };

  return (
    <div ref={containerRef} onDoubleClick={resetView} style={{ width:'100%', height:'100%', position:'relative', background:'#04060a', overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', touchAction:'none' }} />

      <div className="vp-label-tl" style={{ top:'5px', left:'6px' }}>
        <span className="plane-badge plane-3d" style={{ fontSize:'10px', fontWeight:700, padding:'1px 6px', background:'rgba(0,0,0,0.65)', letterSpacing:'0.5px' }}>3D MPR</span>
      </div>

      <div style={{
        position:'absolute', bottom:'6px', left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:'4px', background:'rgba(0,0,0,0.7)',
        padding:'4px 6px', borderRadius:'4px', zIndex:10
      }}>
        <button onClick={resetView} className="btn-icon">↺ Reset</button>
      </div>
    </div>
  );
}
