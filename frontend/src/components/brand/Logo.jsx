export const Logo = ({ className = 'h-9 w-9', alt = 'Roda' }) => (
  <img
    src="/logo.png"
    alt={alt}
    className={`rounded-sm object-cover ${className}`}
    draggable={false}
  />
);
