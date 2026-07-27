'use client';

import { useEffect } from 'react';

export function SuppressWarnings() {
  useEffect(() => {
    // Silence the THREE.Clock deprecation warning caused by @react-three/fiber
    // until the library updates to use THREE.Timer internally.
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
        return;
      }
      originalWarn.apply(console, args);
    };
  }, []);
  return null;
}
