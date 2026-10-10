'use client';
import dynamic from 'next/dynamic';
import { memo } from 'react';

const DustField = dynamic(() => import('./DustField'), { ssr: false });

/** Soft aurora + faint dust + vignette. Purely decorative. */
function Atmosphere() {
  return (
    <div aria-hidden>
      <div className="aurora"><i /><i /><i /></div>
      <DustField />
      <div className="vignette" />
    </div>
  );
}
export default memo(Atmosphere);
