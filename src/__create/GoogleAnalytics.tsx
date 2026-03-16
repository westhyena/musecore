import { useEffect, type FC } from 'react';
import { useLocation } from 'react-router';

const GA_MEASUREMENT_ID = import.meta.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID as string | undefined;

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Google Analytics 4 (GA4) 스크립트 로더 및 페이지뷰 추적
 * - SPA 라우트 변경 시 page_view 이벤트 전송
 */
export const GoogleAnalytics: FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

    // gtag 스크립트 로드
    const existingScript = document.querySelector(
      'script[src*="googletagmanager.com/gtag/js"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer?.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // SPA이므로 수동으로 page_view 전송
      });
    }

    // 페이지뷰 추적 (라우트 변경 시)
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);

  return null;
};

/**
 * 커스텀 이벤트 전송 유틸리티
 * 사용 예: trackEvent('button_click', { button_name: 'signup' })
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag('event', eventName, params);
}
