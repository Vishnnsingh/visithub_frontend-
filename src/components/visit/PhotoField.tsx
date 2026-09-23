import { Camera01Icon, Cancel01Icon, Upload04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { compressImage } from '../../lib/compressImage';
import { CenteredOverlay } from './CenteredOverlay';

export function PhotoField({
  label,
  value,
  onChange,
  mode = 'both',
  required = false,
}: {
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  mode?: 'both' | 'upload' | 'photo';
  required?: boolean;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const preview = value ? URL.createObjectURL(value) : null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pickFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a photo');
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file, `doc-${Date.now()}.jpg`, 1920);
      onChange(compressed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not compress photo');
    } finally {
      setCompressing(false);
    }
  };

  const openCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-fog">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </p>
      {preview ? (
        <img src={preview} alt={label} className="mb-3 h-28 w-full rounded-2xl border border-line object-cover" />
      ) : null}
      <div className="flex gap-2">
        <input
          ref={uploadRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            void pickFile(event.target.files?.[0] || null);
            event.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void pickFile(event.target.files?.[0] || null);
            event.target.value = '';
          }}
        />
        {mode !== 'photo' ? (
          <button
            type="button"
            disabled={compressing}
            onClick={() => uploadRef.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-fog disabled:opacity-60"
          >
            <HugeiconsIcon icon={Upload04Icon} size={14} color="currentColor" strokeWidth={1.8} />
            {compressing ? 'Compressing...' : 'Upload'}
          </button>
        ) : null}
        {mode !== 'upload' ? (
          <button
            type="button"
            disabled={compressing}
            onClick={() => void openCamera()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-fog disabled:opacity-60"
          >
            <HugeiconsIcon icon={Camera01Icon} size={14} color="currentColor" strokeWidth={1.8} />
            {compressing ? 'Compressing...' : 'Take photo'}
          </button>
        ) : null}
      </div>
      {cameraOpen ? (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onFallback={() => {
            setCameraOpen(false);
            cameraInputRef.current?.click();
          }}
          onCapture={(file) => {
            void pickFile(file);
            setCameraOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CameraCapture({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFallbackRef = useRef(onFallback);
  const [ready, setReady] = useState(false);
  onFallbackRef.current = onFallback;

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const stream = await getCameraStream();
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        if (active) setReady(true);
      } catch {
        toast.error('Allow camera permission to take a photo');
        onFallbackRef.current();
      }
    };

    void start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error('Camera is not ready yet');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not capture photo');
        return;
      }
      onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <CenteredOverlay className="bg-ink/50">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Take photo</p>
          <button type="button" onClick={onClose} className="text-mute">
            <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={1.8} />
          </button>
        </div>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-64 w-full rounded-2xl bg-ink object-cover"
        />
        <button
          type="button"
          disabled={!ready}
          onClick={capture}
          className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {ready ? 'Capture photo' : 'Opening camera...'}
        </button>
      </div>
    </CenteredOverlay>
  );
}

async function getCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}
