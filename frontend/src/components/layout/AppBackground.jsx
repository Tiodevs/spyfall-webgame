export const AppBackground = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden bg-background" aria-hidden>
    <div className="absolute inset-0 bg-grid-pattern opacity-50" />
    <div
      className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full opacity-25 blur-[120px]"
      style={{ background: 'radial-gradient(circle, rgba(170, 204, 0, 0.2) 0%, transparent 70%)' }}
    />
    <div
      className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full opacity-20 blur-[100px]"
      style={{ background: 'radial-gradient(circle, rgba(170, 204, 0, 0.12) 0%, transparent 70%)' }}
    />
    <svg
      className="absolute left-0 top-1/4 h-64 w-48 opacity-[0.05] text-white"
      viewBox="0 0 200 200"
      fill="none"
    >
      <path d="M0 100 Q50 50 100 100 T200 100" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <path d="M0 120 Q50 70 100 120 T200 120" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <path d="M0 80 Q50 30 100 80 T200 80" stroke="currentColor" strokeWidth="0.5" fill="none" />
    </svg>
    <svg
      className="absolute right-0 bottom-1/4 h-64 w-48 rotate-180 opacity-[0.05] text-white"
      viewBox="0 0 200 200"
      fill="none"
    >
      <path d="M0 100 Q50 50 100 100 T200 100" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <path d="M0 120 Q50 70 100 120 T200 120" stroke="currentColor" strokeWidth="0.5" fill="none" />
    </svg>
  </div>
);
