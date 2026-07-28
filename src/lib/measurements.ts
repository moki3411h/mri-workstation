// Measurement tools drawn on the MRI viewport canvas

export type MeasurementType = 'distance' | 'angle' | 'roi' | 'arrow';

export interface Point { x: number; y: number; }

export interface Measurement {
  id:     string;
  type:   MeasurementType;
  points: Point[];     // normalized 0-1 coords
  label?: string;
  color:  string;
  value?: number;      // calculated value in mm
  complete: boolean;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export const TOOL_COLORS: Record<MeasurementType, string> = {
  distance: '#ffe040',
  angle:    '#60d0ff',
  roi:      '#60ffa0',
  arrow:    '#f97316',
};

// Convert canvas pixel to normalized coords
export function toNorm(px: number, py: number, W: number, H: number): Point {
  return { x: px / W, y: py / H };
}

// Convert normalized to canvas pixel
export function toPx(nx: number, ny: number, W: number, H: number): Point {
  return { x: nx * W, y: ny * H };
}

// Calculate distance between two points (in normalized space, then scale by FOV)
export function calcDistance(p1: Point, p2: Point, fovMm: number, canvasW: number, canvasH: number): number {
  const dx = (p2.x - p1.x) * fovMm;
  const dy = (p2.y - p1.y) * fovMm * (canvasH / canvasW);
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate angle at p2 formed by p1-p2-p3
export function calcAngle(p1: Point, p2: Point, p3: Point): number {
  const a1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  let deg = Math.abs((a2 - a1) * (180 / Math.PI));
  if (deg > 180) deg = 360 - deg;
  return deg;
}

// Draw distance measurement
export function drawDistance(
  ctx: CanvasRenderingContext2D,
  p1: Point, p2: Point,
  W: number, H: number,
  color: string,
  distMm: number,
  partial = false,
) {
  const x1 = p1.x * W, y1 = p1.y * H;
  const x2 = p2.x * W, y2 = p2.y * H;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  // Main line
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

  // End caps
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAngle = angle + Math.PI / 2;
  const capLen = 6;
  for (const [cx, cy] of [[x1, y1], [x2, y2]]) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(perpAngle) * capLen, cy + Math.sin(perpAngle) * capLen);
    ctx.lineTo(cx - Math.cos(perpAngle) * capLen, cy - Math.sin(perpAngle) * capLen);
    ctx.stroke();
  }

  // Endpoint dots
  ctx.fillStyle = color;
  for (const [cx, cy] of [[x1, y1], [x2, y2]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  }

  if (!partial) {
    // Label
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(midX - 22, midY - 10, 44, 14);
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${distMm.toFixed(1)} mm`, midX, midY);
  }

  ctx.restore();
}

// Draw angle measurement
export function drawAngle(
  ctx: CanvasRenderingContext2D,
  p1: Point, p2: Point, p3: Point,
  W: number, H: number,
  color: string,
  angleDeg: number,
  partial = false,
) {
  const [x1, y1] = [p1.x * W, p1.y * H];
  const [x2, y2] = [p2.x * W, p2.y * H];
  const [x3, y3] = [p3.x * W, p3.y * H];

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Two lines
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  if (!partial) {
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
    // Arc
    const r = 20;
    const a1 = Math.atan2(y1 - y2, x1 - x2);
    const a2 = Math.atan2(y3 - y2, x3 - x2);
    ctx.beginPath(); ctx.arc(x2, y2, r, a1, a2); ctx.stroke();

    // Label
    const midAngle = (a1 + a2) / 2;
    const lx = x2 + Math.cos(midAngle) * 32;
    const ly = y2 + Math.sin(midAngle) * 32 - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(lx - 16, ly - 10, 32, 14);
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${angleDeg.toFixed(1)}°`, lx, ly);
  }

  // Dots
  ctx.fillStyle = color;
  for (const [cx, cy] of [[x1,y1],[x2,y2],...(!partial?[[x3,y3]]:[])]) {
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Draw ROI ellipse
export function drawROI(
  ctx: CanvasRenderingContext2D,
  p1: Point, p2: Point,
  W: number, H: number,
  color: string,
) {
  const x1 = p1.x * W, y1 = p1.y * H;
  const x2 = p2.x * W, y2 = p2.y * H;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const rx = Math.abs(x2 - x1) / 2;
  const ry = Math.abs(y2 - y1) / 2;
  const areaMm2 = (rx / W) * (ry / H) * Math.PI * 200 * 200;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = `${color}18`;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();

  if (rx > 8 && ry > 8) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(cx - 28, cy - 10, 56, 14);
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${areaMm2.toFixed(0)} mm²`, cx, cy);
  }
  ctx.restore();
}
