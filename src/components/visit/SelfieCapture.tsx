import { Camera01Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '../../lib/api';
import { compressImage } from '../../lib/compressImage';
import { CenteredOverlay } from './CenteredOverlay';

type Visitor = { id: string; selfieFile?: string | null };

const SELFIE_MAX_BYTES = 5 * 1024 * 1024;

export function SelfieCapture({
  code,
  visitorId,
  title = 'Take a selfie',
  onSaved,
}: {
  code: string;
  visitorId: string;
  title?: string;
  onSaved: (visitor: Visitor, meeting?: Record<string, unknown>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [shot, setShot] = useState<Blob | null>(null);

  useEffect(() => {
    if (shot) return undefined;
    let active = true;

    const start = async () => {
      try {
        const stream = await getSelfieStream();
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
        toast.error('Allow camera permission to take a selfie');
      }
    };

    void start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setReady(false);
    };
  }, [shot]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error('Camera is not ready yet');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      toast.error('Could not capture selfie');
      return;
    }
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Could not capture selfie');
          return;
        }
        if (blob.size > SELFIE_MAX_BYTES) {
          toast.error('Selfie must be 5 MB or smaller');
          return;
        }
        setPreview(URL.createObjectURL(blob));
        setShot(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setShot(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shot) throw new Error('Take a selfie first');
      if (shot.size > SELFIE_MAX_BYTES) {
        throw new Error('Selfie must be 5 MB or smaller');
      }
      const file = await compressImage(shot, `selfie-${Date.now()}.jpg`);
      if (file.size > SELFIE_MAX_BYTES) {
        throw new Error('Selfie must be 5 MB or smaller');
      }
      const form = new FormData();
      form.append('selfie', file);
      const response = await api.post(`/qr/visit/${code}/selfie/${visitorId}`, form);
      return response.data.data as { visitor: Visitor; meeting?: Record<string, unknown> };
    },
    onSuccess: (data) => onSaved(data.visitor, data.meeting),
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save selfie')),
  });

  return (
    <CenteredOverlay>
      <div className="mx-auto w-full max-w-lg rounded-3xl bg-card p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">{title.startsWith('Take') ? title : `Take a ${title.toLowerCase()}`}</h2>
        <p className="mt-1 text-sm text-mute">
          New selfie for this visit — required every time you check in. Max 5 MB.
        </p>

        <div className="relative mx-auto mt-4 aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl bg-ink">
          {preview ? (
            <img src={preview} alt="Selfie preview" className="h-full w-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
          )}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="h-52 w-40 rounded-full border-2 border-white/80 shadow-[0_0_0_999px_rgba(17,24,39,0.35)]" />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            if (file.size > SELFIE_MAX_BYTES) {
              toast.error('Selfie must be 5 MB or smaller');
              return;
            }
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(file));
            setShot(file);
          }}
        />

        {shot ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={retake}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-3 text-sm font-semibold text-fog"
            >
              <HugeiconsIcon icon={Refresh01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              Retake
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving...' : 'Use this selfie'}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={!ready}
              onClick={capture}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <HugeiconsIcon icon={Camera01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              {ready ? 'Capture selfie' : 'Waiting for camera...'}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-center text-xs font-medium text-mute">
              Camera not opening? Use phone camera
            </button>
          </div>
        )}
      </div>
    </CenteredOverlay>
  );
}

async function getSelfieStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}
