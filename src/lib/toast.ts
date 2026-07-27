export type ToastType = 'info' | 'success' | 'warn' | 'error';

export function toast(msg: string, type: ToastType = 'info', duration = 3200): void {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), duration);
}
