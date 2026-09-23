import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function visitUrl(publicCode: string) {
  return `${window.location.origin}/g/${publicCode}`;
}

export function QrImage({ value, size }: { value: string; size: number }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return <div className="rounded-xl bg-bg" style={{ width: size, height: size }} />;
  }

  return <img src={src} alt="QR code" width={size} height={size} className="block rounded-xl bg-white" />;
}
