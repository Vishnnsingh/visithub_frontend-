import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { cn } from '../../lib/cn';

export function SignaturePad({
  value,
  onChange,
  className,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    context.strokeStyle = '#111827';
    context.lineWidth = 2;
    context.lineCap = 'round';
  }, []);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const exportFile = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onChange(new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' }));
    }, 'image/png');
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className={cn('h-36 w-full touch-none rounded-2xl border border-line bg-white', className)}
        onPointerDown={(event) => {
          drawing.current = true;
          const context = canvasRef.current?.getContext('2d');
          const { x, y } = point(event);
          context?.beginPath();
          context?.moveTo(x, y);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = canvasRef.current?.getContext('2d');
          const { x, y } = point(event);
          context?.lineTo(x, y);
          context?.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          exportFile();
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-mute">{value ? 'Signature captured' : 'Sign inside the box'}</p>
        <button
          type="button"
          className="text-xs font-semibold text-primary"
          onClick={() => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext('2d');
            if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
            onChange(null);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
