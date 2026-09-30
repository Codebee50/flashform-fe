"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * The join link as a QR code for the projector (PRD §10): students scan it instead of
 * typing the code. Always dark on white, even in dark mode: many scanners can't read an
 * inverted code.
 */
export function JoinQrCode({ url, className = "" }: { url: string; className?: string }) {
  return (
    <figure className={`flex shrink-0 flex-col items-center ${className}`}>
      <div className="rounded-md bg-white p-3 ring-1 ring-border">
        <QRCodeSVG
          value={url}
          // Drawn at the largest size shown; the CSS size scales it down on smaller screens.
          size={192}
          level="M"
          title={`QR code for ${url}`}
          className="size-36 sm:size-48"
        />
      </div>
      <figcaption className="mt-3 text-body-lg text-text-muted">Scan to join</figcaption>
    </figure>
  );
}
