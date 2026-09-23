import {
  ArrowRight01Icon,
  Call02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Location01Icon,
  Mail01Icon,
  Menu01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '../components/brand/Logo';
import { LandingFeatures } from '../components/landing/LandingFeatures';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingOrgFit } from '../components/landing/LandingOrgFit';
import { LandingVisitorHome } from '../components/landing/LandingVisitorHome';
import { LandingHelpChat } from '../components/landing/LandingHelpChat';
import { LandingGridGlow } from '../components/landing/LandingGridGlow';
import { LandingThemeProvider, type LandingTheme } from '../components/landing/landingTheme';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';

type Plan = {
  id: string;
  name: string;
  months: number;
  priceInr: number;
  description: string;
  features: string[];
  highlighted: boolean;
};

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'visitor', label: 'Visitor' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'contact', label: 'Contact' },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: 'smooth' });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function toEmbedMapUrl(url: string, address = '') {
  const trimmed = url.trim();
  if (!trimmed && !address.trim()) return '';

  // Already an embed URL
  if (trimmed.includes('/maps/embed') || /[?&]output=embed\b/i.test(trimmed)) {
    return trimmed;
  }

  // Coordinates from full Google Maps links: @28.47,77.50,17z
  const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    const [, lat, lng] = coordMatch;
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }

  // Place / search query in URL: ?q=...
  try {
    const parsed = new URL(trimmed);
    const q = parsed.searchParams.get('q');
    if (q) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
    }
  } catch {
    /* ignore */
  }

  // Short share links (maps.app.goo.gl) cannot be iframed — use address text
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmed)) {
    const place = address.trim() || trimmed;
    return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=15&output=embed`;
  }

  // Generic Google Maps / any text → embed by query
  const place = trimmed || address.trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=15&output=embed`;
}


export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', mobile: '', message: '' });
  const [contactSending, setContactSending] = useState(false);

  const themeQuery = useQuery({
    queryKey: ['landing-theme'],
    queryFn: async () => {
      const response = await api.get('/landing-theme');
      return response.data.data as { theme: LandingTheme };
    },
    staleTime: 30_000,
  });

  const contactInfoQuery = useQuery({
    queryKey: ['landing-contact-info'],
    queryFn: async () => {
      const response = await api.get('/contact/info');
      return response.data.data as {
        email: string;
        phone: string;
        address: string;
        mapUrl: string;
        mapActive: boolean;
      };
    },
    staleTime: 30_000,
  });

  const contactInfo = contactInfoQuery.data || {
    email: 'support@visithub.in',
    phone: '9534470488',
    address: 'Alpha 1, Greater Noida, UP 201310',
    mapUrl: '',
    mapActive: false,
  };

  const theme: LandingTheme = themeQuery.data?.theme === 'light' ? 'light' : 'dark';
  const isLight = theme === 'light';

  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const response = await api.get('/plans');
      return response.data.data as Plan[];
    },
  });

  useEffect(() => {
    document.title = 'Visit Hub · Smart visitor operations';
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onContact = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !contact.name.trim() ||
      !contact.email.trim() ||
      !contact.mobile.trim() ||
      !contact.message.trim()
    ) {
      toast.error('Please fill all required fields');
      return;
    }
    setContactSending(true);
    try {
      await api.post('/contact', {
        name: contact.name.trim(),
        email: contact.email.trim(),
        mobile: contact.mobile.trim(),
        message: contact.message.trim(),
      });
      toast.success('Thanks — we will get back to you shortly.');
      setContact({ name: '', email: '', mobile: '', message: '' });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not send message'));
    } finally {
      setContactSending(false);
    }
  };

  const goTo = (id: string) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <LandingThemeProvider theme={theme}>
      <div
        className={cn(
          'relative min-h-screen overflow-x-hidden',
          isLight ? 'bg-[#f4f4f5] text-[#111827]/85' : 'bg-[#050505] text-white/70'
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.4]"
          style={{
            backgroundImage: isLight
              ? 'linear-gradient(to right, rgba(17,24,39,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.07) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <LandingGridGlow isLight={isLight} />
        <div className="relative z-10">
        <header
          className={cn(
            'fixed inset-x-0 top-0 z-50 w-full border-b backdrop-blur-xl',
            isLight
              ? 'border-black/8 bg-white/80 text-[#111827]'
              : 'border-white/6 bg-[#050505]/80 text-white'
          )}
        >
          <div className="relative mx-auto flex h-16 w-full items-center justify-between px-6 sm:h-[4.25rem] sm:px-10 lg:px-16 xl:px-24">
            <div className="relative z-10 shrink-0">
              <Logo to="/" light={!isLight} />
            </div>

            <nav
              className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 lg:flex"
              aria-label="Primary"
            >
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition',
                    isLight ? 'text-[#111827]/85 hover:text-[#111827]' : 'text-white/70 hover:text-white'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="relative z-10 flex shrink-0 items-center gap-2">
              <Link
                to="/login"
                className={cn(
                  'hidden rounded-full px-3.5 py-2 text-sm font-semibold transition sm:inline-flex',
                  isLight ? 'text-[#111827]/92 hover:text-[#111827]' : 'text-white/80 hover:text-white'
                )}
              >
                Login
              </Link>
              <Link
                to="/create-account"
                className={cn(
                  'hidden items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold sm:inline-flex',
                  isLight
                    ? 'bg-[#111827] text-white hover:bg-[#0b1220]'
                    : 'bg-white text-[#050505] shadow-[0_0_28px_rgba(255,255,255,0.2)] hover:bg-white/90'
                )}
              >
                Register
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
              </Link>
              <button
                type="button"
                className={cn(
                  'grid size-10 place-items-center rounded-full lg:hidden',
                  isLight ? 'bg-[#111827]/10 text-[#111827]' : 'bg-white/10 text-white'
                )}
                onClick={() => setMenuOpen((value) => !value)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                <HugeiconsIcon icon={menuOpen ? Cancel01Icon : Menu01Icon} size={18} color="currentColor" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {menuOpen ? (
            <div
              className={cn(
                'border-t px-6 py-3 sm:px-10 lg:hidden',
                isLight ? 'border-black/8 bg-white' : 'border-white/6 bg-[#0a0a0a]'
              )}
            >
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                      isLight ? 'text-[#111827]/92 hover:bg-[#111827]/5' : 'text-white/80 hover:text-white'
                    )}
                    onClick={() => goTo(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                <Link
                  to="/login"
                  className={cn(
                    'rounded-full py-3 text-center text-sm font-semibold',
                    isLight ? 'bg-[#111827]/8 text-[#111827]' : 'bg-white/10 text-white'
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/create-account"
                  className={cn(
                    'rounded-full py-3 text-center text-sm font-semibold',
                    isLight ? 'bg-[#111827] text-white' : 'bg-white text-[#050505]'
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            </div>
          ) : null}
        </header>

        <main className="pt-16 sm:pt-[4.25rem]">
          <LandingHero />

          <LandingVisitorHome />

          <LandingOrgFit />

          <LandingFeatures />

          <section
            id="pricing"
            className="w-full scroll-mt-20 bg-transparent"
          >
            <div className="w-full px-6 py-16 sm:px-10 lg:px-16 lg:py-24 xl:px-24">
              <div className="max-w-3xl">
                <p
                  className={cn(
                    'text-xs font-semibold tracking-[0.22em] uppercase',
                    isLight ? 'text-[#111827]/70' : 'text-white/40'
                  )}
                >
                  Pricing
                </p>
                <h2
                  className={cn(
                    'mt-3 font-[Outfit,sans-serif] text-3xl font-bold tracking-tight sm:text-4xl',
                    isLight ? 'text-[#111827]' : 'text-white'
                  )}
                >
                  Plans for 1 month, 6 months, 1 year — or custom
                </h2>
                <p className={cn('mt-4 text-base', isLight ? 'text-[#111827]/78' : 'text-white/55')}>
                  Prices and features are controlled by super admin. What you set in the admin Plans screen appears
                  here for organisations.
                </p>
              </div>

              {plansQuery.isLoading ? (
                <p className={cn('mt-10 text-sm', isLight ? 'text-[#111827]/72' : 'text-white/45')}>Loading plans...</p>
              ) : plansQuery.error ? (
                <p className="mt-10 text-sm text-danger">{getApiErrorMessage(plansQuery.error)}</p>
              ) : (
                <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {(plansQuery.data || []).map((plan) => {
                    const isCustom =
                      plan.name.toLowerCase().includes('custom') || plan.months <= 0 || plan.priceInr <= 0;
                    return (
                    <article
                      key={plan.id}
                      className={cn(
                        'flex flex-col rounded-[1.75rem] p-6',
                        plan.highlighted
                          ? isLight
                            ? 'border border-black/10 bg-white text-[#111827] shadow-[0_0_48px_rgba(0,0,0,0.06)]'
                            : 'bg-white text-[#050505] shadow-[0_0_48px_rgba(255,255,255,0.12)]'
                          : isLight
                            ? 'border border-black/10 bg-white text-[#111827]'
                            : 'bg-white/[0.04] text-white'
                      )}
                    >
                      <p
                        className={cn(
                          'text-xs font-semibold tracking-[0.16em] uppercase',
                          plan.highlighted
                            ? isLight
                              ? 'text-[#111827]/80'
                              : 'text-[#050505]/60'
                            : isLight
                              ? 'text-[#111827]/70'
                              : 'text-white/40'
                        )}
                      >
                        {isCustom
                          ? 'Flexible'
                          : `${plan.months} month${plan.months === 1 ? '' : 's'}`}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">{plan.name}</h3>
                      <p
                        className={cn(
                          'mt-3 text-4xl font-bold tracking-tight',
                          plan.highlighted
                            ? isLight
                              ? 'text-[#111827]'
                              : 'text-[#050505]'
                            : isLight
                              ? 'text-[#111827]'
                              : 'text-white'
                        )}
                      >
                        {isCustom ? "Let's talk" : formatPrice(plan.priceInr)}
                      </p>
                      <p
                        className={cn(
                          'mt-2 text-sm',
                          plan.highlighted
                            ? isLight
                              ? 'text-[#111827]/85'
                              : 'text-[#050505]/70'
                            : isLight
                              ? 'text-[#111827]/78'
                              : 'text-white/55'
                        )}
                      >
                        {plan.description}
                      </p>
                      <ul className="mt-6 space-y-2.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              size={18}
                              color="currentColor"
                              strokeWidth={1.8}
                              className={cn(
                                'mt-0.5 shrink-0',
                                plan.highlighted
                                  ? isLight
                                    ? 'text-[#111827]'
                                    : 'text-[#050505]'
                                  : isLight
                                    ? 'text-[#111827]'
                                    : 'text-white'
                              )}
                            />
                            <span
                              className={
                                plan.highlighted
                                  ? isLight
                                    ? 'text-[#111827]/92'
                                    : 'text-[#050505]/80'
                                  : isLight
                                    ? 'text-[#111827]/80'
                                    : 'text-white/60'
                              }
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/create-account"
                        className={cn(
                          'mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold',
                          plan.highlighted
                            ? 'bg-[#050505] text-white hover:bg-black'
                            : isLight
                              ? 'bg-[#111827] text-white hover:bg-[#0b1220]'
                              : 'bg-white text-[#050505] hover:bg-white/90'
                        )}
                      >
                        {isCustom ? 'Get custom plan' : 'Register'}
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
                      </Link>
                    </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section
            id="contact"
            className={cn(
              'w-full scroll-mt-20',
              isLight ? 'bg-white/50' : 'bg-[#0a0a0a]/55'
            )}
          >
            <div className="grid w-full gap-10 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:px-16 lg:py-24 xl:px-24">
              <div>
                <p
                  className={cn(
                    'text-xs font-semibold tracking-[0.22em] uppercase',
                    isLight ? 'text-[#111827]/70' : 'text-white/40'
                  )}
                >
                  Contact
                </p>
                <h2
                  className={cn(
                    'mt-3 font-[Outfit,sans-serif] text-3xl font-bold tracking-tight sm:text-4xl',
                    isLight ? 'text-[#111827]' : 'text-white'
                  )}
                >
                  Let’s set up Visit Hub for your organisation
                </h2>
                <p className={cn('mt-4 text-base', isLight ? 'text-[#111827]/78' : 'text-white/55')}>
                  Tell us about your school, office, hospital or society. We’ll help with QR flow, home page and
                  the right plan.
                </p>
                <div
                  className={cn(
                    'mt-8 space-y-3 text-sm',
                    isLight ? 'text-[#111827]/80' : 'text-white/60'
                  )}
                >
                  <p className="inline-flex items-center gap-2">
                    <HugeiconsIcon icon={Mail01Icon} size={18} color="currentColor" strokeWidth={1.8} />
                    <a href={`mailto:${contactInfo.email}`} className="hover:underline">
                      {contactInfo.email}
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <HugeiconsIcon icon={Call02Icon} size={18} color="currentColor" strokeWidth={1.8} />
                    <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="hover:underline">
                      {contactInfo.phone}
                    </a>
                  </p>
                  <p className="flex items-start gap-2">
                    <HugeiconsIcon
                      icon={Location01Icon}
                      size={18}
                      color="currentColor"
                      strokeWidth={1.8}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{contactInfo.address}</span>
                  </p>
                </div>

                {contactInfo.mapActive && contactInfo.mapUrl ? (
                  <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                    <iframe
                      title="Visit Hub location"
                      src={toEmbedMapUrl(contactInfo.mapUrl, contactInfo.address)}
                      className="h-56 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                ) : null}
              </div>
              <form
                onSubmit={onContact}
                className={cn(
                  'rounded-[1.75rem] p-5 sm:p-6',
                  isLight ? 'border border-black/10 bg-[#f4f4f5]' : 'bg-white/[0.04]'
                )}
              >
                <label
                  className={cn('block text-sm font-medium', isLight ? 'text-[#111827]' : 'text-white')}
                >
                  Name <span className="text-red-500">*</span>
                  <input
                    required
                    className={cn(
                      'mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none',
                      isLight
                        ? 'border border-black/10 bg-white text-[#111827] placeholder:text-[#111827]/55 focus:bg-white'
                        : 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/10'
                    )}
                    value={contact.name}
                    onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Your name"
                  />
                </label>
                <label
                  className={cn('mt-4 block text-sm font-medium', isLight ? 'text-[#111827]' : 'text-white')}
                >
                  Email <span className="text-red-500">*</span>
                  <input
                    required
                    className={cn(
                      'mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none',
                      isLight
                        ? 'border border-black/10 bg-white text-[#111827] placeholder:text-[#111827]/55 focus:bg-white'
                        : 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/10'
                    )}
                    type="email"
                    value={contact.email}
                    onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@organisation.in"
                  />
                </label>
                <label
                  className={cn('mt-4 block text-sm font-medium', isLight ? 'text-[#111827]' : 'text-white')}
                >
                  Mobile number <span className="text-red-500">*</span>
                  <input
                    required
                    className={cn(
                      'mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none',
                      isLight
                        ? 'border border-black/10 bg-white text-[#111827] placeholder:text-[#111827]/55 focus:bg-white'
                        : 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/10'
                    )}
                    type="tel"
                    inputMode="tel"
                    value={contact.mobile}
                    onChange={(event) => setContact((current) => ({ ...current, mobile: event.target.value }))}
                    placeholder="Enter your mobile number"
                  />
                </label>
                <label
                  className={cn('mt-4 block text-sm font-medium', isLight ? 'text-[#111827]' : 'text-white')}
                >
                  Message <span className="text-red-500">*</span>
                  <textarea
                    required
                    className={cn(
                      'mt-1.5 min-h-28 w-full resize-y rounded-xl px-4 py-3 text-sm outline-none',
                      isLight
                        ? 'border border-black/10 bg-white text-[#111827] placeholder:text-[#111827]/55 focus:bg-white'
                        : 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/10'
                    )}
                    value={contact.message}
                    onChange={(event) => setContact((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Tell us about your organisation"
                  />
                </label>
                <button
                  type="submit"
                  disabled={contactSending}
                  className={cn(
                    'mt-5 w-full rounded-full py-3 text-sm font-semibold disabled:opacity-60',
                    isLight
                      ? 'bg-[#111827] text-white hover:bg-[#0b1220]'
                      : 'bg-white text-[#050505] hover:bg-white/90'
                  )}
                >
                  {contactSending ? 'Sending...' : 'Send message'}
                </button>
              </form>
            </div>
          </section>
        </main>

        <footer
          className={cn(
            'relative w-full overflow-hidden',
            isLight ? 'border-t border-black/10 text-[#111827]' : 'border-t border-white/10 text-white'
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-0 h-64 w-80 rounded-full blur-3xl"
            style={{
              background: isLight
                ? 'radial-gradient(circle, rgba(17,24,39,0.08), transparent 70%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)',
            }}
          />

          <div className="relative mx-auto w-full px-6 pt-14 pb-8 sm:px-10 lg:px-16 xl:px-24">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              <div className="relative max-w-xs">
                <Logo to="/" light={!isLight} />
                <p
                  className={cn(
                    'mt-3 text-sm leading-relaxed',
                    isLight ? 'text-[#111827]/78' : 'text-white/55'
                  )}
                >
                  Smart visitor operations for schools, offices, and every organisation.
                </p>
                <Link
                  to="/create-account"
                  className={cn(
                    'mt-5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                    isLight
                      ? 'bg-[#111827] text-white hover:bg-[#0b1220]'
                      : 'bg-white text-[#050505] shadow-[0_0_32px_rgba(255,255,255,0.28)] hover:bg-white/90'
                  )}
                >
                  Register
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
                </Link>
              </div>

              <div>
                <p className={cn('text-sm font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                  Explore
                </p>
                <ul className="mt-4 space-y-2.5">
                  {NAV.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo(item.id)}
                        className={cn(
                          'text-sm transition',
                          isLight
                            ? 'text-[#111827]/78 hover:text-[#111827]'
                            : 'text-white/55 hover:text-white'
                        )}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className={cn('text-sm font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                  Account
                </p>
                <ul className="mt-4 space-y-2.5">
                  <li>
                    <Link
                      to="/login"
                      className={cn(
                        'text-sm transition',
                        isLight
                          ? 'text-[#111827]/78 hover:text-[#111827]'
                          : 'text-white/55 hover:text-white'
                      )}
                    >
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/create-account"
                      className={cn(
                        'text-sm transition',
                        isLight
                          ? 'text-[#111827]/78 hover:text-[#111827]'
                          : 'text-white/55 hover:text-white'
                      )}
                    >
                      Register
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => goTo('contact')}
                      className={cn(
                        'text-sm transition',
                        isLight
                          ? 'text-[#111827]/78 hover:text-[#111827]'
                          : 'text-white/55 hover:text-white'
                      )}
                    >
                      Contact
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <p className={cn('text-sm font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
                  Contact
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className={cn(
                        'transition',
                        isLight
                          ? 'text-[#111827]/78 hover:text-[#111827]'
                          : 'text-white/55 hover:text-white'
                      )}
                    >
                      {contactInfo.email}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                      className={cn(
                        'transition',
                        isLight
                          ? 'text-[#111827]/78 hover:text-[#111827]'
                          : 'text-white/55 hover:text-white'
                      )}
                    >
                      {contactInfo.phone}
                    </a>
                  </li>
                  <li
                    className={cn(
                      'leading-relaxed',
                      isLight ? 'text-[#111827]/78' : 'text-white/55'
                    )}
                  >
                    {contactInfo.address}
                  </li>
                </ul>
              </div>
            </div>

            <div
              className={cn(
                'mt-12 border-t pt-6',
                isLight ? 'border-black/10' : 'border-white/10'
              )}
            >
              <p className={cn('text-sm', isLight ? 'text-[#111827]/72' : 'text-white/45')}>
                © {new Date().getFullYear()} Visit Hub. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
        </div>
      </div>
      <LandingHelpChat />
    </LandingThemeProvider>
  );
}
