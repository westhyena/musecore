import { useEffect, useMemo, useRef, useState } from 'react';

type BannerAdProps = {
  slotId?: string;
  className?: string;
  /** semantic position hint for styling hooks if needed */
  position?: 'top' | 'bottom' | 'inline';
  /** hide container when no ad height is rendered */
  hideIfEmpty?: boolean;
};

/**
 * Google AdSense responsive banner.
 * - Requires NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT and NEXT_PUBLIC_ADSENSE_SLOT_BANNER
 * - In dev mode, sets data-adtest="on" to avoid policy issues
 */
export default function BannerAd({ slotId, className, position = 'inline', hideIfEmpty = true }: BannerAdProps) {
  const clientId = import.meta.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT as string | undefined;
  const fallbackSlot = import.meta.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER as string | undefined;
  const resolvedSlotId = slotId ?? fallbackSlot;

  const isProduction = import.meta.env.MODE === 'production';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const [hasHeight, setHasHeight] = useState(false);

  const shouldRender = useMemo(() => {
    return Boolean(clientId && resolvedSlotId);
  }, [clientId, resolvedSlotId]);

  useEffect(() => {
    if (!shouldRender) return;
    // Avoid pushing multiple times for the same instance
    if (initialized.current) return;
    initialized.current = true;
    try {
      // @ts-expect-error window.adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // Silently ignore; ads may be blocked by extensions or security headers
    }
  }, [shouldRender]);

  // Detect actual rendered height, hide when empty (no-fill / adblock)
  useEffect(() => {
    if (!shouldRender) return;
    const target = containerRef.current as HTMLElement | null;
    if (!target || typeof ResizeObserver === 'undefined') return;

    const update = () => {
      const height = target.offsetHeight || (insRef.current as unknown as HTMLElement | null)?.offsetHeight || 0;
      setHasHeight(height > 8); // consider tiny heights as empty
    };

    // Initial check + timeout fallback (some ads take longer)
    update();
    const timeout = window.setTimeout(update, 2500);

    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => {
      window.clearTimeout(timeout);
      ro.disconnect();
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  const hiddenClass = hideIfEmpty && !hasHeight ? 'hidden' : '';

  return (
    <div
      ref={containerRef}
      className={
        [
          'w-full flex justify-center',
          position === 'bottom' ? 'mt-6 mb-2' : position === 'top' ? 'mb-6 mt-2' : 'my-4',
          hiddenClass,
          className ?? '',
        ].join(' ').trim()
      }
      aria-label="광고"
      role="complementary"
    >
      {/* Responsive ad unit */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: 60 }}
        data-ad-client={clientId}
        data-ad-slot={resolvedSlotId}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
        // Only in dev, mark as test ads
        {...(!isProduction ? { 'data-adtest': 'on' } : {})}
        ref={insRef as unknown as React.RefObject<any>}
      />
    </div>
  );
}


