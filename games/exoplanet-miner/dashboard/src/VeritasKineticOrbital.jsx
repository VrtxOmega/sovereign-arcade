import React, { useRef, useMemo, useEffect, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Error boundary to catch WebGL/R3F crashes gracefully
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.warn('[VeritasKineticOrbital] WebGL error caught:', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '300px', width: '100%', margin: '15px 0', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#555', fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '1px' }}>
            <div style={{ color: 'var(--gold, #c9a84c)', marginBottom: '8px' }}>⚠ WEBGL CONTEXT UNAVAILABLE</div>
            <div>3D projection disabled — 2D waveform active above</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const starVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starFragmentShader = `
  varying vec3 vNormal;
  uniform vec3 color;
  uniform float radius;
  void main() {
    // Eddington Limb Darkening Approximation
    float mu = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float darkening = 0.4 + 0.6 * mu;
    
    // Adjust intensity curve slightly by stellar radius for visual fidelity
    float intensity = pow(mu, 1.0 / (radius + 0.5));
    
    vec3 limbColor = vec3(0.6, 0.2, 0.0);
    vec3 coreColor = mix(color, vec3(1.0, 0.9, 0.7), intensity);
    vec3 finalColor = mix(limbColor, coreColor, darkening);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/* ──────────────────────────────────────────────────────────
   LightcurveWaveform — procedural Canvas transit visualization
   Renders for ALL candidates, regardless of SEAL state.
   Uses actual depth & period to draw a mathematically correct
   transit dip waveform with animated scan line.
   ────────────────────────────────────────────────────────── */
const WAVEFORM_COLORS = {
  PASS: { line: '#00ff88', glow: 'rgba(0,255,136,0.15)', scanLine: '#00ff88' },
  MODEL_BOUND: { line: '#ffaa00', glow: 'rgba(255,170,0,0.12)', scanLine: '#ffaa00' },
  INCONCLUSIVE: { line: '#c9a84c', glow: 'rgba(201,168,76,0.10)', scanLine: '#c9a84c' },
  VIOLATION: { line: '#ff4444', glow: 'rgba(255,68,68,0.12)', scanLine: '#ff4444' },
};

const LightcurveWaveform = ({ transitData, verdict }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const palette = WAVEFORM_COLORS[verdict] || WAVEFORM_COLORS.INCONCLUSIVE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const depth = Math.min(transitData?.depth || 0.001, 0.05);
    const period = transitData?.period_days || 5.0;
    const duration = transitData?.duration_days || 0.3;
    const snr = transitData?.snr || 5.0;

    // Guard against zero-size canvas
    if (W <= 0 || H <= 0) return;

    // Noise scale inversely proportional to SNR
    const noiseScale = Math.max(0.002, 0.03 / Math.sqrt(snr));

    // Transit dip shape (box-like with ingress/egress smoothing)
    const transitFraction = duration / period;
    const ingressWidth = transitFraction * 0.15;
    
    function transitFlux(phase) {
      // phase in [0, 1]
      const center = 0.5;
      const halfDur = transitFraction / 2;
      const dist = Math.abs(phase - center);
      
      if (dist > halfDur + ingressWidth) return 1.0;
      if (dist < halfDur - ingressWidth) return 1.0 - depth * 2000; // scale depth for visibility
      // Smooth ingress/egress
      const t = (dist - (halfDur - ingressWidth)) / (2 * ingressWidth);
      return 1.0 - depth * 2000 * (1.0 - t * t);
    }

    let scanPhase = 0;
    
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0a0a');
      bgGrad.addColorStop(1, '#050505');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(201,168,76,0.06)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 5; i++) {
        const y = (H * 0.15) + (H * 0.7) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const x = W * (i / 7);
        ctx.beginPath();
        ctx.moveTo(x, H * 0.1);
        ctx.lineTo(x, H * 0.9);
        ctx.stroke();
      }

      // Draw lightcurve waveform
      const baselineY = H * 0.4;
      const fluxScale = H * 0.5;
      const nPoints = 300;

      // Glow pass
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < nPoints; i++) {
        const phase = i / nPoints;
        const x = (i / nPoints) * W;
        const flux = transitFlux(phase);
        const noise = (Math.random() - 0.5) * noiseScale * fluxScale;
        const y = baselineY + (1.0 - flux) * fluxScale + noise;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Main line pass
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < nPoints; i++) {
        const phase = i / nPoints;
        const x = (i / nPoints) * W;
        const flux = transitFlux(phase);
        const noise = (Math.random() - 0.5) * noiseScale * fluxScale * 0.3;
        const y = baselineY + (1.0 - flux) * fluxScale + noise;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Dot scatter overlay (simulated photometric measurements)
      for (let i = 0; i < 120; i++) {
        const phase = Math.random();
        const x = phase * W;
        const flux = transitFlux(phase);
        const noise = (Math.random() - 0.5) * noiseScale * fluxScale * 2.5;
        const y = baselineY + (1.0 - flux) * fluxScale + noise;
        
        ctx.fillStyle = palette.line;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Animated scan line
      scanPhase = (scanPhase + 0.003) % 1.0;
      const scanX = scanPhase * W;
      const scanGrad = ctx.createLinearGradient(scanX - 20, 0, scanX + 20, 0);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, palette.scanLine + '40');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(scanX - 20, H * 0.1, 40, H * 0.8);

      // Axis labels
      ctx.fillStyle = '#555';
      ctx.font = '9px monospace';
      ctx.fillText('PHASE (0)', 4, H - 4);
      ctx.fillText('(1)', W - 16, H - 4);
      ctx.fillText('NORM. FLUX', 4, H * 0.13);

      // Transit dip marker
      const dipX = W * 0.5;
      const dipY = baselineY + depth * 2000 * fluxScale;
      ctx.fillStyle = palette.scanLine + '60';
      ctx.beginPath();
      ctx.moveTo(dipX - 4, dipY + 8);
      ctx.lineTo(dipX + 4, dipY + 8);
      ctx.lineTo(dipX, dipY + 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [transitData, verdict, palette]);

  return (
    <div style={{ position: 'relative', height: '180px', width: '100%', margin: '15px 0', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: '6px', left: '10px', color: palette.scanLine, fontSize: '0.6rem', letterSpacing: '1.5px', fontFamily: 'monospace', textShadow: '0px 0px 4px #000', opacity: 0.8 }}>
        TRANSIT LIGHTCURVE WAVEFORM
      </div>
    </div>
  );
};

export const VeritasKineticOrbital = ({ claimState, transitData }) => {
  // Always render the lightcurve waveform for ALL candidates
  // Only render the full 3D orbital projection if SEALED (PASS)
  
  if (claimState !== 'SEALED') {
    return <LightcurveWaveform transitData={transitData} verdict={claimState} />;
  }

  const { stellar_radius, depth, period_days } = transitData;
  const transitDepth = depth || 0.0001;
  const orbitalPeriod = period_days || 1.0;
  const stellarRadius = stellar_radius || 1.0;
  
  // Rp = Rs * sqrt(Depth) => However, for visualization we might need to scale the relative size if depth is tiny (e.g. Earth transit is 0.00008)
  const exactPlanetaryRadius = stellarRadius * Math.sqrt(transitDepth);
  const visualScaleParam = 10.0; // UI scaler to make tiny planets perceptibly block pixels
  const planetaryRadius = exactPlanetaryRadius * visualScaleParam;

  return (
    <>
      <LightcurveWaveform transitData={transitData} verdict="PASS" />
      <CanvasErrorBoundary>
        <div className="orbital-canvas-container" style={{ height: '300px', width: '100%', margin: '15px 0', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
          <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
            <color attach="background" args={['#0a0a0a']} />
            <ambientLight intensity={0.1} />
            <HostStar radius={stellarRadius * 0.5} />
            <OccludingBody 
              planetaryRadius={planetaryRadius * 0.5} 
              orbitalPeriod={orbitalPeriod} 
              distance={stellarRadius * 0.5 + 0.6} 
            />
          </Canvas>
          <div style={{ position: 'absolute', marginTop: '-30px', marginLeft: '10px', color: 'var(--gold)', fontSize: '0.65rem', letterSpacing: '1px', fontFamily: 'monospace', textShadow: '0px 0px 3px #000' }}>
            KINETIC WEBGL PROJECTION Ω
          </div>
        </div>
      </CanvasErrorBoundary>
    </>
  );
};

const HostStar = ({ radius }) => {
  const uniforms = useMemo(() => ({
    color: { value: new THREE.Color("#ffaa00") },
    radius: { value: radius }
  }), [radius]);

  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial 
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

const OccludingBody = ({ planetaryRadius, orbitalPeriod, distance }) => {
  const meshRef = useRef();

  useFrame(() => {
    // Synchronize WebGL clock to global UTC timestamp (eliminating isolated getElapsedTime drift)
    const t = Date.now() / 1000.0;
    const speedScale = 1.0; 
    const phase = (t / orbitalPeriod) * speedScale * Math.PI * 2; 
    
    if (meshRef.current) {
      meshRef.current.position.x = Math.cos(phase) * distance;
      meshRef.current.position.z = Math.sin(phase) * distance;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[planetaryRadius, 32, 32]} />
      <meshBasicMaterial color="#000000" />
    </mesh>
  );
};

