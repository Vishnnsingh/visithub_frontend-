import { ArrowRight01Icon, Cancel01Icon, Comment01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';
import { api, getApiErrorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useIsLandingLight } from './landingTheme';

type ChatMsg = {
  id: string;
  from: 'bot' | 'user';
  text: string;
};

type Step = 'name' | 'email' | 'mobile' | 'problem' | 'done';

const BOT = {
  greet: 'Hi! Welcome to Visit Hub Help. What is your full name?',
  email: 'Thanks. What is your email address?',
  mobile: 'Got it. Please share your mobile number.',
  problem: 'How can we help you today? Please describe your issue briefly.',
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidMobile(value: string) {
  return /^[0-9+\-\s]{8,15}$/.test(value.trim());
}

export function LandingHelpChat() {
  const isLight = useIsLandingLight();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('name');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'greet', from: 'bot', text: BOT.greet },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [open, messages, step]);

  const resetChat = () => {
    setStep('name');
    setDraft('');
    setName('');
    setEmail('');
    setMobile('');
    setSending(false);
    setMessages([{ id: 'greet', from: 'bot', text: BOT.greet }]);
  };

  const push = (from: 'bot' | 'user', text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, from, text }]);
  };

  const submitProblem = async (problem: string) => {
    setSending(true);
    try {
      const response = await api.post('/help', {
        name,
        email,
        mobile,
        message: problem,
      });
      const data = response.data.data as {
        supportEmail?: string;
        supportPhone?: string;
      };
      const supportEmail = data.supportEmail || 'support@visithub.in';
      const supportPhone = data.supportPhone || '9534470488';
      push(
        'bot',
        `Thank you. We will connect with you soon.\n\nYou can also reach us at:\nEmail: ${supportEmail}\nPhone: ${supportPhone}`
      );
      setStep('done');
    } catch (error) {
      push('bot', getApiErrorMessage(error, 'Could not send. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const onSend = async () => {
    const value = draft.trim();
    if (!value || sending || step === 'done') return;

    if (step === 'name') {
      if (value.length < 2) {
        push('bot', 'Please enter your full name (at least 2 characters).');
        return;
      }
      push('user', value);
      setName(value);
      setDraft('');
      setStep('email');
      push('bot', BOT.email);
      return;
    }

    if (step === 'email') {
      if (!isValidEmail(value)) {
        push('bot', 'Please enter a valid email address.');
        return;
      }
      push('user', value);
      setEmail(value);
      setDraft('');
      setStep('mobile');
      push('bot', BOT.mobile);
      return;
    }

    if (step === 'mobile') {
      if (!isValidMobile(value)) {
        push('bot', 'Please enter a valid mobile number.');
        return;
      }
      push('user', value);
      setMobile(value);
      setDraft('');
      setStep('problem');
      push('bot', BOT.problem);
      return;
    }

    if (step === 'problem') {
      if (value.length < 5) {
        push('bot', 'Please share a bit more detail about your issue.');
        return;
      }
      push('user', value);
      setDraft('');
      await submitProblem(value);
    }
  };

  const placeholder =
    step === 'name'
      ? 'Your name…'
      : step === 'email'
        ? 'Your email…'
        : step === 'mobile'
          ? 'Your mobile…'
          : step === 'problem'
            ? 'Describe your problem…'
            : 'Chat closed';

  return (
    <div className="fixed right-4 bottom-4 z-[80] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div
          className={cn(
            'flex h-[min(520px,70vh)] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-3xl border shadow-2xl',
            isLight
              ? 'border-black/10 bg-white text-[#111827]'
              : 'border-white/15 bg-[#0a0a0a] text-white'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-3 border-b px-4 py-3',
              isLight ? 'border-black/10 bg-[#f4f4f5]' : 'border-white/10 bg-white/5'
            )}
          >
            <div>
              <p className="text-sm font-semibold">Help</p>
              <p className={cn('text-xs', isLight ? 'text-[#111827]/78' : 'text-white/55')}>
                We typically reply soon
              </p>
            </div>
            <div className="flex gap-1">
              {step === 'done' ? (
                <button
                  type="button"
                  onClick={resetChat}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold',
                    isLight ? 'bg-black text-white' : 'bg-white text-black'
                  )}
                >
                  New chat
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-full p-2',
                  isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                )}
                aria-label="Close help"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.from === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.from === 'user'
                      ? isLight
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                      : isLight
                        ? 'bg-[#f4f4f5] text-[#111827]'
                        : 'bg-white/10 text-white'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {step !== 'done' ? (
            <form
              className={cn(
                'flex gap-2 border-t p-3',
                isLight ? 'border-black/10' : 'border-white/10'
              )}
              onSubmit={(event) => {
                event.preventDefault();
                void onSend();
              }}
            >
              <input
                ref={inputRef}
                className={cn(
                  'min-w-0 flex-1 rounded-full border px-4 py-2.5 text-sm outline-none',
                  isLight
                    ? 'border-black/10 bg-white text-[#111827] placeholder:text-[#111827]/70'
                    : 'border-white/15 bg-white/5 text-white placeholder:text-white/40'
                )}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                disabled={sending}
                maxLength={step === 'problem' ? 2000 : 80}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50',
                  isLight ? 'bg-black text-white' : 'bg-white text-black'
                )}
                aria-label="Send"
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  color="currentColor"
                  strokeWidth={1.8}
                />
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition',
          isLight
            ? 'bg-black text-white hover:bg-black/90'
            : 'bg-white text-black hover:bg-white/90'
        )}
        aria-expanded={open}
        aria-label="Open help chat"
      >
        <HugeiconsIcon icon={Comment01Icon} size={18} color="currentColor" strokeWidth={1.8} />
        Help
      </button>
    </div>
  );
}
