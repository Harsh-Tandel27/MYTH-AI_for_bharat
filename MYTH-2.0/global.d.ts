/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

// Type declarations for model-viewer web component
interface ModelViewerHTMLAttributes {
  src?: string;
  alt?: string;
  ar?: boolean | string;
  'ar-modes'?: string;
  'camera-controls'?: boolean | string;
  'disable-zoom'?: boolean | string;
  autoplay?: boolean | string;
  'auto-rotate'?: boolean | string;
  poster?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  style?: React.CSSProperties;
  children?: React.ReactNode;
  className?: string;
}

// Augment React's JSX namespace
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerHTMLAttributes;
    }
  }
}

declare global {
  interface Window {
    Clerk?: {
      billing?: {
        getPlans(): Promise<any[]>;
        getSubscription(): Promise<any>;
        createCheckout(options: {
          planId: string;
          successUrl: string;
          cancelUrl: string;
          mode?: string;
        }): Promise<{ url: string }>;
        cancelSubscription(): Promise<void>;
      };
    };
  }
}

export {};