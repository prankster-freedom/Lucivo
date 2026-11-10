export function showToast(msg: string): void {
  const toast = document.getElementById('toast');
  const label = document.getElementById('toast-message');
  if (!toast || !label) return;
  label.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 2000);
}

export function updateStatus(text: string, type: 'info' | 'success' | 'warning' = 'info'): void {
  const pill = document.getElementById('telemetry-pill');
  const dot = document.getElementById('telemetry-dot');
  const status = document.getElementById('telemetry-status');
  if (!pill || !dot || !status) return;
  status.textContent = text;
  pill.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono shadow-md backdrop-blur-md transition-all';
  if (type === 'success') {
    pill.classList.add('bg-emerald-500/10', 'text-emerald-600', 'border-emerald-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
  } else if (type === 'warning') {
    pill.classList.add('bg-amber-500/10', 'text-amber-600', 'border-amber-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-500';
  } else {
    pill.classList.add('bg-blue-500/10', 'text-blue-600', 'border-blue-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-blue-500';
  }
}
