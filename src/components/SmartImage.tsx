'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Remote article images come from an editor-chosen CDN and are not
 * known at build time, so next/image cannot optimise them. When the
 * CDN is unreachable we swap in a local branded placeholder instead
 * of showing a broken-image icon.
 *
 * The ref + effect guard covers the race where the image errors
 * before hydration: the error event has already fired by the time
 * React attaches onError, so only an explicit post-mount check of
 * `complete` + `naturalWidth` catches it.
 */
const FALLBACK_SRC = '/images/cover-fallback.svg';

type SmartImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
};

export default function SmartImage({ src, alt, ...rest }: SmartImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el !== null && el.complete && el.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element -- local static asset
    return <img src={FALLBACK_SRC} alt={alt} {...rest} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see file docstring
    <img
      ref={ref}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
