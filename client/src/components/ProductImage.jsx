import { useState, useEffect } from 'react';

/* Single image-frame primitive used on every product surface.
   Fixed aspect (or fixed size via className) + object-contain keeps every
   image fully visible and uncropped, with zero layout shift. */
export default function ProductImage({
  src,
  alt,
  aspect = 'square', // 'square' | '4/3' — ignored when className sets explicit w-/h-
  padding = 'p-6',
  eager = false,
  className = '',
  children,
}) {
  const [imgError, setImgError] = useState(false);

  // A new src gets a fresh chance — without this, a preview whose src swaps
  // (e.g. the admin ImagePicker) stays stuck on the fallback icon forever.
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasFixedSize = /(^|\s)[wh]-/.test(className);
  const aspectClass = hasFixedSize ? '' : aspect === 'square' ? 'aspect-square' : 'aspect-[4/3]';

  return (
    <div className={`relative overflow-hidden rounded-card bg-bg-alt ${aspectClass} ${padding} ${className}`}>
      {imgError ? (
        <div className="w-full h-full flex items-center justify-center text-ink-faint">
          <svg className="w-1/3 h-1/3 min-w-4 min-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setImgError(true)}
        />
      )}
      {children}
    </div>
  );
}
