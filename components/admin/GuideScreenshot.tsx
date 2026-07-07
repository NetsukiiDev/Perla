"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

// Renders a setup-guide screenshot from /public. Until the real PNG is dropped
// in, `onError` swaps in a labelled placeholder that names the expected file
// path, so the guide stays presentable with or without the images.
export function GuideScreenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="overflow-hidden rounded-lg border border-surface-border">
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 bg-background px-4 py-10 text-center text-muted">
          <ImageOff size={22} aria-hidden="true" />
          <p className="text-xs">Screenshot da aggiungere</p>
          <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-foreground">public{src}</code>
        </div>
      ) : (
        // Static guide asset from /public; next/image adds no value here.
        // The ref check catches images that already 404'd during SSR, before
        // hydration attached onError (which would otherwise miss the error).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(node) => {
            if (node && node.complete && node.naturalWidth === 0) setFailed(true);
          }}
          src={src}
          alt={alt}
          className="block w-full"
          onError={() => setFailed(true)}
        />
      )}
      {caption && (
        <figcaption className="border-t border-surface-border bg-surface px-3 py-2 text-xs text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}
