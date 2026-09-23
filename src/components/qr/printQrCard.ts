import QRCode from 'qrcode';
import { visitUrl } from './QrImage';

type PrintQrItem = {
  label: string;
  publicCode: string;
  organizationName: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function printQrCard(item: PrintQrItem) {
  const dataUrl = await QRCode.toDataURL(visitUrl(item.publicCode), {
    width: 480,
    margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', `Print ${item.label}`);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error('Could not open print view');
  }

  const name = escapeHtml(item.organizationName);
  const label = escapeHtml(item.label);

  frameDocument.open();
  frameDocument.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Card for ${label}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      html, body {
        margin: 0;
        background: #ffffff;
        color: #111827;
        font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
      }
      .sheet { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .card {
        width: 420px;
        padding: 40px 32px;
        border: 1px dashed #111827;
        border-radius: 28px;
        text-align: center;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .name { margin: 0; font-size: 18px; font-weight: 600; }
      .label { margin: 8px 0 28px; font-size: 34px; font-weight: 700; letter-spacing: -0.03em; }
      img { width: 220px; height: 220px; display: block; margin: 0 auto; }
      .scan { margin: 28px 0 0; font-size: 14px; color: #374151; line-height: 1.5; }
      .note { margin: 10px 0 0; font-size: 14px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <article class="card">
        <p class="name">${name}</p>
        <p class="label">${label}</p>
        <img src="${dataUrl}" alt="QR code" />
        <p class="scan">Scan QR code for visiting our ${name}</p>
        <p class="note">Don't forget mark out timing</p>
      </article>
    </div>
  </body>
</html>`);
  frameDocument.close();

  await new Promise<void>((resolve, reject) => {
    const image = frameDocument.querySelector('img');
    const printNow = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(() => iframe.remove(), 500);
        resolve();
      } catch (error) {
        iframe.remove();
        reject(error);
      }
    };
    if (!image || image.complete) {
      window.setTimeout(printNow, 80);
      return;
    }
    image.addEventListener('load', printNow, { once: true });
    image.addEventListener('error', printNow, { once: true });
  });
}
