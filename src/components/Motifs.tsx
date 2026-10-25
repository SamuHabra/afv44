import { useId } from 'react';

/** Bande tissée (triangles safran / soleil sur encre), inspirée du foulard. */
export function KenteBand({ height = 14, className = '' }: { height?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width="100%" height={height} aria-hidden="true" className={className}>
      <defs>
        <pattern id={id} width={height * 2} height={height} patternUnits="userSpaceOnUse">
          <rect width={height * 2} height={height} fill="#17120E" />
          <path d={`M0 ${height} L${height / 2} 0 L${height} ${height} Z`} fill="#F2A32B" />
          <path d={`M${height} 0 L${height * 1.5} ${height} L${height * 2} 0 Z`} fill="#E2702E" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/** Disque de soleil décoratif. */
export function SunDisc({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`absolute rounded-full bg-soleil/25 pointer-events-none ${className}`} />;
}

/** Illustration en cadre d'arche. */
export function ArchImage({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden bg-encre ${className}`} style={{ borderRadius: '999px 999px 18px 18px' }}>
      <img src="/femme-africaine.jpg" alt="" className="w-full h-full object-cover object-top" />
    </div>
  );
}
