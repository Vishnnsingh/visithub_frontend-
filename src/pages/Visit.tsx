import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Home01Icon,
  IdentificationIcon,
  MoreHorizontalIcon,
  UserIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PhotoField } from '../components/visit/PhotoField';
import { SelfieCapture } from '../components/visit/SelfieCapture';
import { SignaturePad } from '../components/visit/SignaturePad';
import { GoogleContinue } from '../components/visit/GoogleContinue';
import { CheckoutModal } from '../components/visit/CheckoutModal';
import { GetAppPanel } from '../components/visit/GetAppPanel';
import { MeetingPanel } from '../components/visit/MeetingPanel';
import { PullToRefresh } from '../components/visit/PullToRefresh';
import { CenteredOverlay } from '../components/visit/CenteredOverlay';
import { VisitStamp, visitStampKind } from '../components/visit/VisitStamp';
import { SelectField } from '../components/ui/Fields';
import { api, getApiErrorMessage, publicUploadUrl } from '../lib/api';
import { cn } from '../lib/cn';
import { isStandaloneApp } from '../lib/installPrompt';
import {
  askNotifications,
  clearGoogleAccount,
  clearOpenVisit,
  clearVisitAuth,
  isGoogleSessionFresh,
  readGoogleAccount,
  readGoogleReturn,
  readVisitSession,
  readVisitorUid,
  registerVisitApp,
  writeGoogleAccount,
  writeLastGoogleEmail,
  writeOpenVisit,
  writeVisitSession,
  writeVisitorUid,
  readPreferredGoogleEmail,
  clearGoogleReturn,
  type VisitGoogleAccount,
} from '../lib/visitIdentity';
import { getSocket } from '../lib/socket';
import { showVisitNotice, subscribeVisitPush, type VisitNotice } from '../lib/visitPush';
import { isVisitThemeId, resolveVisitTheme, visitThemeClass, type VisitThemeId } from '../lib/visitTheme';
import { HomeElements } from '../components/visit/HomeElements';
import type { PublicHomeLayout } from '../lib/homeLayout';

type FieldType = 'text' | 'date' | 'time' | 'tel' | 'textarea' | 'signature' | 'photo' | 'upload' | 'number' | 'alpha' | 'mix';
type VisitField = { key: string; label: string; type: FieldType; required: boolean; locked?: boolean; value?: string };

function sanitizeVisitInput(type: FieldType, value: string) {
  if (type === 'tel') return value.replace(/\D/g, '').slice(0, 10);
  if (type === 'number') return value.replace(/\D/g, '').slice(0, 40);
  if (type === 'alpha') return value.replace(/[^A-Za-z\s]/g, '').slice(0, 80);
  if (type === 'mix') return value.replace(/[^A-Za-z0-9\s]/g, '').slice(0, 80);
  return value;
}

function visitInputHint(type: FieldType) {
  if (type === 'number') return 'Numbers only';
  if (type === 'alpha') return 'Letters only';
  if (type === 'mix') return 'Numbers + alphabet';
  return '';
}
type TabId = 'details' | 'meeting' | 'history' | 'app' | 'home';

type Gate = { label: string; publicCode: string };

type Visitor = {
  id: string;
  visitorUid?: string;
  ticketId?: string;
  rating?: number | null;
  label: string;
  publicCode: string;
  date: string | null;
  visitorName: string | null;
  email?: string | null;
  mobileNumber: string | null;
  addressCompany: string | null;
  personToMeet: string | null;
  department: string | null;
  purpose: string | null;
  vehicleNumber: string | null;
  inTime: string | null;
  outTime: string | null;
  outLabel?: string | null;
  outPublicCode?: string | null;
  duration?: string | null;
  signatureFile: string | null;
  remarks: string | null;
  aadhaarFrontFile: string | null;
  aadhaarBackFile: string | null;
  selfieFile: string | null;
  outPhotoFile?: string | null;
  customValues?: Record<string, string>;
  ticketStatus?: string | null;
  declined?: boolean;
  closedAt?: string | null;
  createdAt: string;
  waitEndsAt?: string | null;
  waitMinutes?: number | null;
  waitStartedAt?: string | null;
  waitSource?: 'default' | 'manual' | null;
};

type VisitPayload = {
  organizationId?: string;
  organizationName: string;
  organizationLogo?: string | null;
  organizationWelcomeImage?: string | null;
  googleClientId?: string | null;
  continueWithGoogle?: boolean;
  continueWithNumber?: boolean;
  homeLayout?: PublicHomeLayout | null;
  vapidPublicKey?: string | null;
  label: string;
  publicCode: string;
  selfieEnabled?: boolean;
  selfieRequired?: boolean;
  selfieLabel?: string;
  indiaDate?: string;
  indiaInTime?: string;
  defaultWaitMinutes?: number | null;
  gates?: Gate[];
  meetingPeople?: string[];
  meetingBoard?: {
    date: string;
    items: Array<{
      name: string;
      status: 'yes' | 'no' | null;
      label: string;
      nextAvailableDate?: string | null;
      nextAvailableInDays?: number | null;
    }>;
  } | null;
  googleReview?: {
    enabled: boolean;
    url: string;
    label?: string;
    hint?: string;
  } | null;
  fields: VisitField[];
  visitor?: Visitor;
  items?: Visitor[];
  known?: boolean;
  visitCount?: number;
  email?: string | null;
  googleToken?: string;
  openVisit?: Visitor | null;
  profile?: Visitor | null;
  checkout?: boolean;
  meeting?: {
    personName: string;
    availability: 'yes' | 'no' | null;
    label: string;
    waitEndsAt?: string | null;
    waitMinutes?: number | null;
    remainingMs?: number;
    waitSource?: 'default' | 'manual' | null;
    nextAvailableDate?: string | null;
    nextAvailableInDays?: number | null;
    checkoutReady?: boolean;
    remarksEnabled?: boolean;
    signatureEnabled?: boolean;
    outPhotoEnabled?: boolean;
    remarksLabel?: string;
    signatureLabel?: string;
    outPhotoLabel?: string;
    ratingEnabled?: boolean;
    ratingLabel?: string;
    remarksRequired?: boolean;
    signatureRequired?: boolean;
    outPhotoRequired?: boolean;
    checkoutFields?: { key: string; label: string; type: string; required?: boolean; custom?: boolean }[];
  };
};

const TABS: { id: TabId; label: string; icon: IconSvgElement }[] = [
  { id: 'home', label: 'Home', icon: Home01Icon },
  { id: 'meeting', label: 'Visitors', icon: UserMultipleIcon },
  { id: 'details', label: 'Details', icon: IdentificationIcon },
  { id: 'history', label: 'History', icon: Clock01Icon },
  { id: 'app', label: 'More', icon: MoreHorizontalIcon },
];

function formatLockedDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatLockedTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function indiaNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    hour: Number(parts.hour),
  };
}

function indiaGreeting() {
  const hour = indiaNow().hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function storageKey(code: string) {
  return `visitor-entry:${code}`;
}

function rememberVisitor(organizationId: string | undefined, visitor: Visitor) {
  if (!organizationId) return;
  if (visitor.visitorUid) writeVisitorUid(organizationId, visitor.visitorUid);
  if (visitor.outTime) clearOpenVisit(organizationId);
  else writeOpenVisit(organizationId, visitor.id);
}

function restoreSession(code: string) {
  const session = readVisitSession(code);
  const storedId = typeof window === 'undefined' ? '' : window.sessionStorage.getItem(storageKey(code)) || '';
  const visitorId = session?.visitorId || storedId;
  return {
    google: session?.google || null,
    visitorId,
    tab: (session?.tab || (visitorId ? 'meeting' : 'home')) as TabId,
  };
}

export function Visit() {
  const { code = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>(() => restoreSession(code).tab);
  const [detailsKey, setDetailsKey] = useState(0);
  const [google, setGoogle] = useState<VisitGoogleAccount | null>(() => restoreSession(code).google);
  const [visitorId, setVisitorId] = useState(() => restoreSession(code).visitorId);
  const [checkout, setCheckout] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [, setPendingSelfie] = useState(false);
  const [selfieSaved, setSelfieSaved] = useState(false);
  const [bgTheme, setBgTheme] = useState<VisitThemeId>('default');

  useEffect(() => {
    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const theme = detail && typeof detail === 'object' ? detail.theme : detail;
      if (isVisitThemeId(theme)) setBgTheme(theme);
    };
    window.addEventListener('kavion-visit-theme', onTheme);
    return () => window.removeEventListener('kavion-visit-theme', onTheme);
  }, []);

  const visitQuery = useQuery({
    queryKey: ['qr-visit', code],
    enabled: Boolean(code),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await api.get(`/qr/visit/${code}`);
      return response.data.data as VisitPayload;
    },
    retry: false,
  });

  const orgId = visitQuery.data?.organizationId;
  const uid = orgId ? readVisitorUid(orgId) : '';
  const googleResumeKey = useRef('');
  const autoPhoneKey = useRef('');
  const exitHomeRef = useRef(false);
  const themeScope = orgId || code;
  const orgDefaultTheme = isVisitThemeId(visitQuery.data?.homeLayout?.bgTheme)
    ? visitQuery.data?.homeLayout?.bgTheme
    : 'default';

  useEffect(() => {
    if (!visitQuery.data) return;
    setBgTheme(resolveVisitTheme(themeScope, orgDefaultTheme));
  }, [visitQuery.data, themeScope, orgDefaultTheme]);

  const notifyTab = searchParams.get('tab');

  useEffect(() => {
    const session = restoreSession(code);
    setGoogle(session.google);
    setVisitorId(session.visitorId);
    setTab(notifyTab === 'meeting' ? 'meeting' : session.tab);
    setPendingSelfie(false);
    setSelfieSaved(false);
    setCheckout(false);
  }, [code]);

  useEffect(() => {
    if (notifyTab !== 'meeting') return;
    setTab('meeting');
    writeVisitSession(code, { tab: 'meeting' });
  }, [notifyTab, code]);

  useEffect(() => {
    if (!visitQuery.data?.organizationId) return;
    // Home-screen shortcut opens public home; QR/scanner keeps /g/:code for Continue with Google
    registerVisitApp(
      visitQuery.data.organizationName,
      `/h/${visitQuery.data.organizationId}`,
      visitQuery.data.organizationLogo || null,
      code
    );
    void askNotifications();
  }, [visitQuery.data?.organizationId, visitQuery.data?.organizationName, visitQuery.data?.organizationLogo, code]);

  // Installed shortcut (standalone) without an active visit session → public home, not Google login
  useEffect(() => {
    if (!visitQuery.data?.organizationId) return;
    if (google || visitorId) return;
    if (!isStandaloneApp()) return;
    navigate(`/h/${visitQuery.data.organizationId}`, { replace: true });
  }, [visitQuery.data?.organizationId, google, visitorId, navigate]);

  const persistGoogle = (account: VisitGoogleAccount) => {
    setGoogle(account);
    writeVisitSession(code, { google: account });
    if (orgId) writeGoogleAccount(orgId, account);
  };

  const forgetGoogle = () => {
    googleResumeKey.current = '';
    setGoogle(null);
    writeVisitSession(code, { google: null });
    clearGoogleAccount(orgId);
  };

  const goExitHome = () => {
    if (exitHomeRef.current) return;
    exitHomeRef.current = true;
    const targetOrgId = orgId || visitQuery.data?.organizationId;
    if (targetOrgId && google?.email && google.auth !== 'phone') {
      writeLastGoogleEmail(targetOrgId, google.email);
    }
    clearVisitAuth(code, orgId || targetOrgId);
    setVisitorId('');
    setGoogle(null);
    setCheckout(false);
    setPendingSelfie(false);
    if (targetOrgId) {
      navigate(`/h/${targetOrgId}`, { replace: true });
      return;
    }
    setTab('home');
  };

  const applyGooglePayload = (
    payload: VisitPayload & {
      email?: string;
      googleToken?: string;
      visitorUid?: string | null;
      auth?: 'google' | 'phone';
      mobileNumber?: string;
      profile?: (VisitGoogleAccount['profile'] & { visitorUid?: string | null }) | null;
    },
    opts?: { restoreOpen?: boolean }
  ) => {
    if (!payload.googleToken || !isGoogleSessionFresh(payload.googleToken)) {
      forgetGoogle();
      return false;
    }
    const auth = payload.auth === 'phone' ? 'phone' : 'google';
    if (auth === 'google' && !payload.email) {
      forgetGoogle();
      return false;
    }
    const account: VisitGoogleAccount = {
      email: payload.email || payload.profile?.email || '',
      googleToken: payload.googleToken,
      auth,
      visitorUid: payload.visitorUid || payload.profile?.visitorUid || null,
      profile: payload.profile
        ? {
            visitorName: payload.profile.visitorName,
            mobileNumber: payload.profile.mobileNumber || payload.mobileNumber || null,
            addressCompany: payload.profile.addressCompany,
            email: payload.profile.email || payload.email || null,
            personToMeet: payload.profile.personToMeet,
            department: payload.profile.department,
            purpose: payload.profile.purpose,
            vehicleNumber: payload.profile.vehicleNumber,
          }
        : payload.mobileNumber
          ? { mobileNumber: payload.mobileNumber }
          : null,
    };
    persistGoogle(account);
    googleResumeKey.current = `${auth}:${account.email}:${account.googleToken}`;
    if (opts?.restoreOpen && payload.openVisit && !visitorId) {
      setVisitorId(payload.openVisit.id);
      setTab('meeting');
      if (orgId) rememberVisitor(orgId, payload.openVisit);
      writeVisitSession(code, { visitorId: payload.openVisit.id, tab: 'meeting' });
    }
    return true;
  };

  const googleMutation = useMutation({
    mutationFn: async (credential: string) => {
      const response = await api.post(`/qr/visit/${code}/google`, { credential });
      return response.data.data as VisitPayload & {
        email: string;
        googleToken: string;
        visitorUid: string | null;
        visitCount?: number;
      };
    },
    onSuccess: (payload) => {
      if (!applyGooglePayload(payload)) {
        toast.error('Google sign-in failed. Try again.');
        return;
      }
      if (payload.openVisit) {
        setVisitorId(payload.openVisit.id);
        const justIn = sessionStorage.getItem('kavion-just-in') === payload.openVisit.id;
        if (!justIn) setCheckout(true);
        if (orgId) rememberVisitor(orgId, payload.openVisit);
        writeVisitSession(code, { visitorId: payload.openVisit.id });
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not continue with Google')),
  });

  const phoneMutation = useMutation({
    mutationFn: async (mobileNumber?: string) => {
      const response = await api.post(`/qr/visit/${code}/phone`, { mobileNumber: mobileNumber || '' });
      return response.data.data as VisitPayload & {
        email?: string;
        googleToken: string;
        auth?: 'google' | 'phone';
        mobileNumber?: string;
        visitorUid?: string | null;
      };
    },
    onSuccess: (payload) => {
      if (!applyGooglePayload({ ...payload, auth: 'phone' })) {
        toast.error('Could not continue with number. Try again.');
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not continue with number')),
  });

  const resumeMutation = useMutation({
    mutationFn: async (account: VisitGoogleAccount) => {
      const response = await api.post(`/qr/visit/${code}/google/resume`, {
        email: account.email,
        googleToken: account.googleToken,
      });
      return response.data.data as VisitPayload & {
        email: string;
        googleToken: string;
        visitorUid: string | null;
      };
    },
    onSuccess: (payload) => {
      applyGooglePayload(payload, { restoreOpen: true });
    },
    onError: () => {
      if (orgId) clearGoogleReturn(orgId);
      forgetGoogle();
    },
  });

  const dbReturningMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post(`/qr/visit/${code}/google/returning`, { email });
      return response.data.data as VisitPayload & {
        email: string;
        googleToken: string;
        visitorUid: string | null;
      };
    },
    onSuccess: (payload) => {
      applyGooglePayload(payload, { restoreOpen: true });
    },
  });

  useEffect(() => {
    if (!orgId) return;
    const saved = readGoogleAccount(orgId);
    if (saved) {
      setGoogle((current) =>
        current && isGoogleSessionFresh(current.googleToken)
          ? {
              ...saved,
              profile: current.profile || saved.profile,
              visitorUid: current.visitorUid || saved.visitorUid,
            }
          : saved
      );
      return;
    }
    setGoogle((current) => (current && !isGoogleSessionFresh(current.googleToken) ? null : current));
  }, [orgId]);

  useEffect(() => {
    if (!google?.googleToken) return;
    if (isGoogleSessionFresh(google.googleToken)) return;
    // Session expired — public org Home link (refresh stays on Home; scan uses /g/:code)
    goExitHome();
  }, [google?.googleToken]);

  useEffect(() => {
    if (!orgId || !code || visitorId || resumeMutation.isPending) return;
    const fresh =
      (google && isGoogleSessionFresh(google.googleToken) ? google : null) || readGoogleAccount(orgId);
    const returning = fresh || readGoogleReturn(orgId);
    if (!returning) return;
    if (returning.auth === 'phone') {
      googleResumeKey.current = `phone:${returning.email}:${returning.googleToken}`;
      return;
    }
    if (!returning.email || !returning.googleToken) return;
    const key = `google:${returning.email}:${returning.googleToken}`;
    if (googleResumeKey.current === key) return;
    googleResumeKey.current = key;
    // Returning visitor (token may be expired) — backend re-issues if email already in DB
    resumeMutation.mutate(returning);
  }, [orgId, code, visitorId, google]);

  useEffect(() => {
    if (!visitQuery.data || !google) return;
    void askNotifications();
  }, [visitQuery.data, google]);

  const entryQuery = useQuery({
    queryKey: ['qr-visit-entry', code, visitorId],
    enabled: Boolean(code && visitorId),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    queryFn: async () => {
      const response = await api.get(`/qr/visit/${code}/entry/${visitorId}`);
      return response.data.data as VisitPayload;
    },
  });

  useEffect(() => {
    if (!visitorId || !detailsKey) return;
    void queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitorId] });
  }, [detailsKey, visitorId, code, queryClient]);

  useEffect(() => {
    if (!visitorId) return;
    const socket = getSocket();
    const entryKey = ['qr-visit-entry', code, visitorId] as const;
    const join = () => socket.emit('join', { visitorId, organizationId: orgId });
    const openVisitors = () => {
      setTab('meeting');
      writeVisitSession(code, { tab: 'meeting' });
    };
    const onUpdate = (payload: {
      visitor?: Visitor;
      meeting?: VisitPayload['meeting'];
      notice?: VisitNotice | null;
    }) => {
      const current = queryClient.getQueryData<VisitPayload>(entryKey);
      if (current) {
        queryClient.setQueryData<VisitPayload>(entryKey, {
          ...current,
          visitor: payload.visitor ? { ...current.visitor, ...payload.visitor } : current.visitor,
          meeting: payload.meeting ? { ...current.meeting, ...payload.meeting } : current.meeting,
        });
      }
      if (payload.notice) {
        openVisitors();
        void showVisitNotice(payload.notice, `/g/${code}?tab=meeting`);
      }
      if (payload.visitor?.outTime) {
        clearVisitAuth(code, orgId);
      }
    };
    join();
    socket.on('connect', join);
    socket.on('visit:updated', onUpdate);
    const onVisible = () => {
      if (document.visibilityState === 'visible') join();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      socket.emit('leave', { visitorId, organizationId: orgId });
      socket.off('connect', join);
      socket.off('visit:updated', onUpdate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [visitorId, orgId, code, queryClient]);

  useEffect(() => {
    if (!visitorId) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'visit-notify') return;
      setTab('meeting');
      writeVisitSession(code, { tab: 'meeting' });
      // Socket already carries live updates; only refetch if cache is empty.
      if (!queryClient.getQueryData(['qr-visit-entry', code, visitorId])) {
        void queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitorId] });
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [visitorId, code, queryClient]);

  useEffect(() => {
    if (!code || !visitorId) return;
    const vapid = visitQuery.data?.vapidPublicKey || entryQuery.data?.vapidPublicKey;
    void (async () => {
      const permission = await askNotifications();
      if (permission === 'granted') await subscribeVisitPush(code, visitorId, vapid);
    })();
  }, [code, visitorId, visitQuery.data?.vapidPublicKey, entryQuery.data?.vapidPublicKey]);

  const historyQuery = useQuery({
    queryKey: ['qr-visit-history', code, visitorId],
    enabled: Boolean(code && visitorId && tab === 'history'),
    queryFn: async () => {
      const response = await api.get(`/qr/visit/${code}/history/${visitorId}`);
      return response.data.data as VisitPayload;
    },
  });

  const visit = entryQuery.data
    ? {
        ...visitQuery.data,
        ...entryQuery.data,
        meeting: entryQuery.data.meeting,
        defaultWaitMinutes: entryQuery.data.defaultWaitMinutes ?? visitQuery.data?.defaultWaitMinutes,
        visitor: entryQuery.data.visitor,
      }
    : visitQuery.data;
  const visitor = entryQuery.data?.visitor;
  const needsForm = Boolean(visitQuery.data && google && !visitorId && !checkout);
  const headerName =
    visitor?.visitorName?.trim() ||
    google?.profile?.visitorName?.trim() ||
    (google?.email ? google.email.split('@')[0] : '') ||
    'Visitor';
  const headerGreeting = indiaGreeting();

  useEffect(() => {
    if (visitor?.selfieFile) setSelfieSaved(true);
  }, [visitor?.selfieFile]);

  useEffect(() => {
    if (visitor?.outTime) {
      clearVisitAuth(code, orgId);
    }
  }, [visitor?.outTime, code, orgId]);
  const selfieEnabled = Boolean(visitQuery.data?.selfieEnabled || entryQuery.data?.selfieEnabled);
  const needsSelfie = Boolean(
    visitorId &&
      selfieEnabled &&
      !needsForm &&
      !checkout &&
      !selfieSaved &&
      visitor &&
      !visitor.selfieFile
  );

  const applyVisit = (next: Visitor, isCheckout?: boolean) => {
    if (orgId) rememberVisitor(orgId, next);
    sessionStorage.setItem(storageKey(code), next.id);
    sessionStorage.setItem('kavion-just-in', next.id);
    setVisitorId(next.id);
    setCheckout(Boolean(isCheckout) && !next.outTime);
    setTab('meeting');
    writeVisitSession(code, { visitorId: next.id, tab: 'meeting' });
    if (!isCheckout && visitQuery.data?.selfieEnabled && !next.selfieFile) {
      setPendingSelfie(true);
      return;
    }
    if (!isCheckout) {
      setSuccessOpen(true);
      window.setTimeout(() => setSuccessOpen(false), 1600);
    }
  };

  const selectTab = (next: TabId) => {
    if (next === 'details' && tab === 'details') setDetailsKey((value) => value + 1);
    setTab(next);
    writeVisitSession(code, { tab: next });
  };

  const refreshPage = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['qr-visit', code] }),
      visitorId ? queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitorId] }) : Promise.resolve(),
      visitorId ? queryClient.invalidateQueries({ queryKey: ['qr-visit-history', code, visitorId] }) : Promise.resolve(),
    ]);
  };

  const showGoogleContinue = visitQuery.data?.continueWithGoogle !== false;
  const showNumberContinue = visitQuery.data?.continueWithNumber !== false;

  useEffect(() => {
    if (!visitQuery.data || google || visitorId) return;
    if (showGoogleContinue || showNumberContinue) return;
    if (autoPhoneKey.current === code || phoneMutation.isPending) return;
    autoPhoneKey.current = code;
    phoneMutation.mutate('');
  }, [visitQuery.data, google, visitorId, code, showGoogleContinue, showNumberContinue]);

  if (visitQuery.isLoading) {
    return <Centered>Opening organisation...</Centered>;
  }
  if (visitQuery.error || !visit) {
    return <Centered error>{getApiErrorMessage(visitQuery.error, 'This QR code is not valid.')}</Centered>;
  }

  if (!google && !visitorId) {
    if (
      isStandaloneApp() ||
      (orgId && readGoogleAccount(orgId)) ||
      resumeMutation.isPending ||
      dbReturningMutation.isPending ||
      phoneMutation.isPending ||
      (!showGoogleContinue && !showNumberContinue)
    ) {
      return <Centered>Opening organisation...</Centered>;
    }
    return (
      <GoogleContinue
        name={visit.organizationName}
        logoFile={visit.organizationLogo}
        welcomeImageFile={visit.organizationWelcomeImage}
        clientId={visit.googleClientId}
        organizationId={orgId || visit.organizationId}
        loading={googleMutation.isPending || resumeMutation.isPending || dbReturningMutation.isPending}
        phoneLoading={phoneMutation.isPending}
        showGoogle={showGoogleContinue}
        showNumber={showNumberContinue}
        loginHint={readPreferredGoogleEmail(orgId || visit.organizationId)}
        onResumeReturning={async (account) => {
          try {
            await resumeMutation.mutateAsync({
              email: account.email,
              googleToken: account.googleToken,
              auth: 'google',
              visitorUid: null,
              profile: null,
            });
            return true;
          } catch {
            return false;
          }
        }}
        onResumeDbEmail={async (email) => {
          try {
            await dbReturningMutation.mutateAsync(email);
            return true;
          } catch {
            return false;
          }
        }}
        onCredential={(credential) => googleMutation.mutate(credential)}
        onContinueWithNumber={(mobile) => phoneMutation.mutate(mobile)}
      />
    );
  }

  return (
    <div className={cn(visitThemeClass(bgTheme), 'flex h-dvh max-h-dvh flex-col overflow-hidden')}>
      <header className="z-20 shrink-0 border-b border-line bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p className="truncate text-sm font-semibold text-ink">{headerName}</p>
          <span className="shrink-0 text-[11px] font-medium text-mute">{headerGreeting}</span>
        </div>
        <p className="text-xs text-mute">{visit.label}</p>
      </header>

      <PullToRefresh onRefresh={refreshPage} resetKey={tab}>
        {tab === 'details' ? (
          visitor ? (
            <VisitorDetails key={detailsKey} visit={visit} visitor={visitor} />
          ) : (
            <p className="text-sm text-mute">Fill your details to continue.</p>
          )
        ) : null}
        {tab === 'meeting' ? (
          <MeetingPanel
            code={code}
            visit={visit}
            visitor={visitor}
            onClosed={() => clearVisitAuth(code, orgId)}
            onVisitComplete={goExitHome}
          />
        ) : null}
        {tab === 'history' ? (
          <HistoryList loading={historyQuery.isLoading} items={historyQuery.data?.items || []} fields={visit.fields} />
        ) : null}
        {tab === 'app' ? (
          <GetAppPanel
            organizationName={visit.organizationName}
            logoFile={visit.organizationLogo}
            themeScope={themeScope}
            orgDefaultTheme={orgDefaultTheme}
            onThemeChange={setBgTheme}
            onNotificationsGranted={() => {
              const vapid = visit.vapidPublicKey;
              if (visitorId) void subscribeVisitPush(code, visitorId, vapid);
            }}
          />
        ) : null}
        {tab === 'home' ? (
          <HomeElements
            layout={visit.homeLayout}
            organizationName={visit.organizationName}
            meetingBoard={visit.meetingBoard}
            googleReview={visit.googleReview}
          />
        ) : null}
      </PullToRefresh>

      <nav className="z-20 shrink-0 px-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg rounded-[1.75rem] border border-line bg-card px-1.5 py-2 shadow-[0_10px_28px_rgba(15,39,68,0.10)]">
          <div className="grid grid-cols-5">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button key={item.id} type="button" onClick={() => selectTab(item.id)} className="flex flex-col items-center gap-1 py-1">
                  <span className={cn('grid size-10 place-items-center rounded-full transition', active ? 'bg-primary text-white' : 'text-mute')}>
                    <HugeiconsIcon icon={item.icon} size={18} color="currentColor" strokeWidth={1.8} />
                  </span>
                  <span className={cn('text-[11px] font-medium', active ? 'text-ink' : 'text-mute')}>{item.label}</span>
                  <span className={cn('mt-0.5 h-0.5 w-5 rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {needsForm && google ? (
        <RegisterModal
          code={code}
          fields={visitQuery.data?.fields || []}
          meetingPeople={visitQuery.data?.meetingPeople || []}
          email={google.email}
          googleToken={google.googleToken}
          auth={google.auth === 'phone' ? 'phone' : 'google'}
          visitorUid={google.visitorUid || uid}
          profile={google.profile}
          onExpired={forgetGoogle}
          onSuccess={(next) => applyVisit(next)}
        />
      ) : null}

      {checkout && visitor && !visitor.outTime ? (
        <CheckoutModal
          code={code}
          visitor={visitor}
          gates={visit.gates || [{ label: visit.label, publicCode: visit.publicCode }]}
          indiaDate={visit.indiaDate || indiaNow().date}
          indiaInTime={visit.indiaInTime || indiaNow().time}
          onSuccess={(next) => {
            applyVisit(next as Visitor, false);
            setCheckout(false);
            if (orgId) clearOpenVisit(orgId);
            setSuccessOpen(true);
            window.setTimeout(() => {
              setSuccessOpen(false);
              goExitHome();
            }, 1600);
            void queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitorId] });
            void queryClient.invalidateQueries({ queryKey: ['qr-visit-history', code, visitorId] });
          }}
        />
      ) : null}

      {needsSelfie ? (
        <SelfieCapture
          code={code}
          visitorId={visitorId}
          title={visit.selfieLabel || 'Selfie'}
          onSaved={async (next, meeting) => {
            setSelfieSaved(true);
            setPendingSelfie(false);
            setTab('meeting');
            writeVisitSession(code, { visitorId, tab: 'meeting' });
            // Save selfie on screen first — do not start counter until success popup closes
            queryClient.setQueryData(['qr-visit-entry', code, visitorId], (current: VisitPayload | undefined) =>
              current
                ? {
                    ...current,
                    visitor: {
                      ...(current.visitor as Visitor),
                      ...next,
                      waitMinutes: null,
                      waitStartedAt: null,
                      waitEndsAt: null,
                      waitSource: null,
                    },
                    meeting: meeting
                      ? {
                          ...current.meeting,
                          ...meeting,
                          waitMinutes: null,
                          waitEndsAt: null,
                          waitStartedAt: null,
                          waitSource: null,
                        }
                      : {
                          ...current.meeting,
                          waitMinutes: null,
                          waitEndsAt: null,
                          waitStartedAt: null,
                          waitSource: null,
                        },
                  }
                : current
            );
            setSuccessOpen(true);
            window.setTimeout(() => {
              setSuccessOpen(false);
              // Counter starts after “selfie submit successfully” popup leaves the screen
              void queryClient.invalidateQueries({ queryKey: ['qr-visit-entry', code, visitorId] });
            }, 1600);
          }}
        />
      ) : null}

      {successOpen ? (
        <CenteredOverlay>
          <div className="w-full max-w-sm rounded-3xl bg-card px-6 py-8 text-center shadow-lg">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-white">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={26} color="currentColor" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-base font-semibold text-ink">Filled successfully</p>
            <p className="mt-1 text-sm text-mute">Your visitor details are saved.</p>
          </div>
        </CenteredOverlay>
      ) : null}
    </div>
  );
}

function Centered({ children, error }: { children: string; error?: boolean }) {
  return (
    <div className="app-bg grid min-h-dvh place-items-center px-4">
      <p className={error ? 'text-sm text-danger' : 'text-sm text-mute'}>{children}</p>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card px-5 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-mute">{text}</p>
    </div>
  );
}

function visitorText(visitor: Visitor, key: string) {
  const custom = visitor.customValues?.[key];
  if (typeof custom === 'string') return custom;
  const value = visitor[key as keyof Visitor];
  return typeof value === 'string' ? value : '';
}

function VisitorDetails({ visit, visitor }: { visit: VisitPayload; visitor: Visitor }) {
  const selfieUrl = publicUploadUrl(visitor.selfieFile);
  const rows = visit.fields
    .filter((field) => field.key !== 'email')
    .map((field) => {
    if (field.type === 'signature') return { key: field.key, label: field.label, image: publicUploadUrl(visitor.signatureFile) };
    if (field.key === 'aadhaarFront') return { key: field.key, label: field.label, image: publicUploadUrl(visitor.aadhaarFrontFile) };
    if (field.key === 'aadhaarBack') return { key: field.key, label: field.label, image: publicUploadUrl(visitor.aadhaarBackFile) };
    if (field.type === 'photo' || field.type === 'upload') {
      return { key: field.key, label: field.label, image: publicUploadUrl(visitor.customValues?.[field.key]) };
    }
    const text = visitorText(visitor, field.key);
    const display =
      field.key === 'date' || field.type === 'date'
        ? formatLockedDate(text)
        : field.key === 'inTime' || field.key === 'outTime' || field.type === 'time'
          ? formatLockedTime(text)
          : text;
    return { key: field.key, label: field.label, value: display };
  });

  return (
    <section className="space-y-3">
      <article className="overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[0_12px_30px_rgba(15,39,68,0.06)]">
        <div className="bg-[#f4fbf8] px-4 pt-5 pb-4 text-center">
          {selfieUrl ? (
            <img
              src={selfieUrl}
              alt={visitor.visitorName || 'Visitor'}
              className="mx-auto size-28 rounded-[1.5rem] border-4 border-white object-cover shadow-[0_10px_28px_rgba(15,39,68,0.12)]"
            />
          ) : (
            <span className="mx-auto grid size-28 place-items-center rounded-[1.5rem] border-4 border-white bg-white text-3xl font-bold text-primary shadow-[0_10px_28px_rgba(15,39,68,0.08)]">
              {(visitor.visitorName || visitor.email || 'V').slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="mt-3 text-lg font-semibold tracking-tight text-ink">{visitor.visitorName || 'Visitor'}</p>
          {visitor.visitorUid ? <p className="mt-0.5 text-xs font-medium text-mute">ID · {visitor.visitorUid}</p> : null}
          {selfieUrl ? (
            <p className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">{visit.selfieLabel || 'Selfie'}</p>
          ) : null}
        </div>
      </article>
      {visitor.email ? (
        <article className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-mute uppercase">Email</p>
          <p className="mt-1 text-sm font-medium text-ink">{visitor.email}</p>
        </article>
      ) : null}
      {rows.map((row) => (
        <article key={row.key} className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-mute uppercase">{row.label}</p>
          {'image' in row && row.image ? (
            <img src={row.image} alt={row.label} className="mt-2 max-h-40 rounded-xl border border-line object-contain" />
          ) : (
            <p className="mt-1 text-sm font-medium text-ink">{row.value || '—'}</p>
          )}
        </article>
      ))}
      <article className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-[11px] font-semibold tracking-wide text-mute uppercase">In gate</p>
        <p className="mt-1 text-sm font-medium text-ink">{visitor.label}</p>
      </article>
      <article className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-[11px] font-semibold tracking-wide text-mute uppercase">Out</p>
        <p className="mt-1 text-sm font-medium text-ink">
          {visitor.outTime
            ? `${formatLockedTime(visitor.outTime)}${visitor.outLabel ? ` · ${visitor.outLabel}` : ''}${visitor.duration ? ` · ${visitor.duration}` : ''}`
            : 'Still inside'}
        </p>
      </article>
      {visitor.outPhotoFile ? (
        <article className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-mute uppercase">Out gate photo</p>
          <img src={publicUploadUrl(visitor.outPhotoFile) || ''} alt="Out gate" className="mt-2 max-h-40 rounded-xl border border-line object-contain" />
        </article>
      ) : null}
    </section>
  );
}

function HistoryList({
  loading,
  items,
  fields,
}: {
  loading: boolean;
  items: Visitor[];
  fields: VisitField[];
}) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const safePage = Math.min(page, pages);
  const paged = items.slice((safePage - 1) * limit, safePage * limit);

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  if (loading) return <p className="text-sm text-mute">Loading history...</p>;
  if (!items.length) return <Placeholder title="History" text="No previous visits yet." />;
  return (
    <div className="space-y-3">
      {paged.map((item) => {
        const stamp = visitStampKind({
          declined: item.declined,
          ticketStatus: item.ticketStatus,
          outTime: item.outTime,
        });
        return (
        <article key={item.id} className="relative overflow-hidden rounded-2xl border border-line bg-card px-4 py-3 pr-24">
          {stamp ? <VisitStamp kind={stamp} /> : null}
          <p className="text-sm font-semibold text-ink">{item.visitorName || 'Visitor'}</p>
          <p className="text-xs text-mute">
            {item.date ? formatLockedDate(item.date) : item.createdAt.slice(0, 10)}
            {item.inTime ? ` · In ${formatLockedTime(item.inTime)} (${item.label})` : ''}
            {item.outTime ? ` · Out ${formatLockedTime(item.outTime)}${item.outLabel ? ` (${item.outLabel})` : ''}` : ''}
          </p>
          {item.duration ? <p className="mt-1 text-xs font-medium text-ink">Stay: {item.duration}</p> : null}
          {stamp === 'unavailable' ? (
            <p className="mt-1 text-xs text-fog">
              Reason:{' '}
              {item.personToMeet
                ? `${item.personToMeet} was not available`
                : 'Meeting person was not available'}
            </p>
          ) : null}
          {fields
            .filter((field) => field.type !== 'photo' && field.type !== 'upload' && field.type !== 'signature')
            .slice(0, 4)
            .map((field) => {
              const value = visitorText(item, field.key);
              if (!value) return null;
              const display =
                field.key === 'date' || field.type === 'date'
                  ? formatLockedDate(value)
                  : field.key === 'inTime' || field.key === 'outTime' || field.type === 'time'
                    ? formatLockedTime(value)
                    : value;
              return (
                <p key={field.key} className="mt-1 text-xs text-fog">
                  {field.label}: {display}
                </p>
              );
            })}
        </article>
        );
      })}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-sm">
        <p className="text-mute">
          Page {safePage} of {pages} · {items.length} visits
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={safePage >= pages}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterModal({
  code,
  fields,
  meetingPeople = [],
  email,
  googleToken,
  auth = 'google',
  visitorUid,
  profile,
  onExpired,
  onSuccess,
}: {
  code: string;
  fields: VisitField[];
  meetingPeople?: string[];
  email: string;
  googleToken: string;
  auth?: 'google' | 'phone';
  visitorUid?: string | null;
  profile?: VisitGoogleAccount['profile'];
  onExpired: () => void;
  onSuccess: (visitor: Visitor) => void;
}) {
  const phoneAuth = auth === 'phone';
  const defaults = useMemo(() => {
    const india = indiaNow();
    const next: Record<string, string> = {};
    for (const field of fields) {
      if (field.key === 'email') next.email = phoneAuth ? profile?.email || '' : email;
      else if (field.key === 'date') next[field.key] = field.value || india.date;
      else if (field.key === 'inTime') next[field.key] = field.value || india.time;
      else if (field.key === 'visitorName') next[field.key] = profile?.visitorName || '';
      else if (field.key === 'mobileNumber') next[field.key] = profile?.mobileNumber || '';
      else if (field.key === 'addressCompany') next[field.key] = profile?.addressCompany || '';
      else next[field.key] = '';
    }
    return next;
  }, [fields, email, profile, phoneAuth]);
  const [values, setValues] = useState(defaults);
  const [personChoice, setPersonChoice] = useState('');
  const [otherPerson, setOtherPerson] = useState('');
  const [signature, setSignature] = useState<File | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [customFiles, setCustomFiles] = useState<Record<string, File | null>>({});
  const personOptions = useMemo(
    () => [...meetingPeople.map((name) => ({ value: name, label: name })), { value: '__other__', label: 'Other' }],
    [meetingPeople]
  );

  useEffect(() => {
    const india = indiaNow();
    setValues((current) => {
      const next = { ...current };
      for (const field of fields) {
        if (field.key === 'email') next.email = phoneAuth ? profile?.email || current.email || '' : email;
        else if (field.key === 'date') next.date = field.value || india.date;
        else if (field.key === 'inTime') next.inTime = field.value || india.time;
        else if (field.key === 'visitorName' && !current.visitorName) next.visitorName = profile?.visitorName || '';
        else if (field.key === 'mobileNumber' && !current.mobileNumber) next.mobileNumber = profile?.mobileNumber || '';
        else if (field.key === 'addressCompany' && !current.addressCompany) next.addressCompany = profile?.addressCompany || '';
      }
      return next;
    });
  }, [fields, email, profile, phoneAuth]);

  useEffect(() => {
    const picked = personChoice === '__other__' ? otherPerson.trim() : personChoice.trim();
    setValues((current) => ({ ...current, personToMeet: picked }));
  }, [personChoice, otherPerson]);

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      for (const field of fields) {
        if (field.type === 'signature' || field.type === 'photo' || field.type === 'upload' || field.key === 'date' || field.key === 'inTime') continue;
        if (field.key === 'email' && !phoneAuth) continue;
        if (field.locked && field.key !== 'email' && field.key !== 'mobileNumber') continue;
        if (field.key === 'personToMeet') {
          const picked = personChoice === '__other__' ? otherPerson.trim() : personChoice.trim();
          form.append('personToMeet', picked);
          continue;
        }
        form.append(field.key, values[field.key] || '');
      }
      if (signature) form.append('signature', signature);
      if (aadhaarFront) form.append('aadhaarFront', aadhaarFront);
      if (aadhaarBack) form.append('aadhaarBack', aadhaarBack);
      for (const [key, file] of Object.entries(customFiles)) {
        if (file) form.append(key, file);
      }
      if (phoneAuth) {
        form.append('auth', 'phone');
        const emailValue = (values.email || '').trim().toLowerCase();
        if (emailValue) form.append('email', emailValue);
      } else {
        form.append('email', email);
      }
      form.append('googleToken', googleToken);
      if (visitorUid) form.append('visitorUid', visitorUid);
      const response = await api.post(`/qr/visit/${code}/register`, form);
      return response.data.data.visitor as Visitor;
    },
    onSuccess,
    onError: (err) => {
      const message = getApiErrorMessage(err, 'Could not save details');
      if (axios.isAxiosError(err) && err.response?.status === 401) onExpired();
      toast.error(message);
    },
  });

  return (
    <CenteredOverlay>
      <form
        className="mx-auto w-full max-w-lg rounded-3xl bg-card p-5 shadow-lg"
        onSubmit={(event) => {
          event.preventDefault();
          if (phoneAuth) {
            if (!/^[6-9]\d{9}$/.test(values.mobileNumber || '')) {
              toast.error('Enter a valid 10-digit Indian mobile number');
              return;
            }
            const emailValue = (values.email || '').trim();
            if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
              toast.error('Enter a valid email');
              return;
            }
          }
          for (const field of fields) {
            if (phoneAuth && field.key === 'email') continue;
            if (!field.required || field.locked) continue;
            if (field.key === 'personToMeet') {
              const picked = personChoice === '__other__' ? otherPerson.trim() : personChoice.trim();
              if (!picked || personChoice === '') {
                toast.error(`${field.label} is required`);
                return;
              }
              continue;
            }
            if (field.key === 'aadhaarFront' && !aadhaarFront) {
              toast.error(`${field.label} is required`);
              return;
            }
            if (field.key === 'aadhaarBack' && !aadhaarBack) {
              toast.error(`${field.label} is required`);
              return;
            }
            if ((field.type === 'photo' || field.type === 'upload') && field.key.startsWith('c_') && !customFiles[field.key]) {
              toast.error(`${field.label} is required`);
              return;
            }
          }
          mutation.mutate();
        }}
      >
        <h2 className="text-lg font-semibold text-ink">Enter details</h2>
        <p className="mt-1 text-sm text-mute">Fill the visitor register to continue.</p>
        <div className="mt-4 space-y-3">
          {fields.filter((field) => field.key !== 'outTime' && field.key !== 'selfie').map((field) => {
            if (phoneAuth && field.key === 'email') {
              return (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-fog">
                    {field.label}
                    <span className="ml-1 text-xs font-normal text-mute">Optional</span>
                  </span>
                  <input
                    className="field-input !pl-4"
                    type="email"
                    value={values.email || ''}
                    placeholder="Email"
                    onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                  />
                  <span className="mt-1.5 block text-xs text-mute">You can edit this email.</span>
                </label>
              );
            }
            if (field.key === 'mobileNumber' || field.type === 'tel') {
              return (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-fog">
                    {field.label}
                    {phoneAuth || field.required ? <span className="text-danger"> *</span> : null}
                  </span>
                  <div className="field-input flex items-center gap-2 !pl-4">
                    <span className="shrink-0 text-sm font-semibold text-ink">+91</span>
                    <span className="h-5 w-px bg-line" />
                    <input
                      className="min-w-0 flex-1 bg-transparent outline-none"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={values[field.key] || ''}
                      required={phoneAuth || field.required}
                      placeholder="10-digit mobile number"
                      onChange={(event) => {
                        const next = sanitizeVisitInput('tel', event.target.value);
                        setValues((current) => ({ ...current, [field.key]: next }));
                      }}
                    />
                  </div>
                  {!phoneAuth ? (
                    <span className="mt-1.5 block text-xs text-mute">You can edit this number.</span>
                  ) : null}
                </label>
              );
            }
            if (field.locked || field.key === 'date' || field.key === 'inTime' || field.key === 'email') {
              const raw = field.key === 'email' ? email : values[field.key] || field.value || '';
              const display =
                field.key === 'date' || field.type === 'date'
                  ? formatLockedDate(raw)
                  : field.key === 'inTime' || field.type === 'time'
                    ? formatLockedTime(raw)
                    : raw;
              return (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-fog">{field.label}</span>
                  <input
                    className="field-input pointer-events-none cursor-default bg-bg !pl-4 text-ink"
                    value={display}
                    readOnly
                    tabIndex={-1}
                  />
                  <span className="mt-1.5 block text-xs text-mute">
                    {field.key === 'email' ? 'Filled from your Google account' : 'Filled automatically from India time (IST)'}
                  </span>
                </label>
              );
            }
            if (field.type === 'signature') {
              return (
                <div key={field.key}>
                  <p className="mb-1.5 text-sm font-medium text-fog">
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                  </p>
                  <SignaturePad value={signature} onChange={setSignature} />
                </div>
              );
            }
            if (field.key === 'aadhaarFront') {
              return <PhotoField key={field.key} label={field.label} value={aadhaarFront} onChange={setAadhaarFront} required={field.required} />;
            }
            if (field.key === 'aadhaarBack') {
              return <PhotoField key={field.key} label={field.label} value={aadhaarBack} onChange={setAadhaarBack} required={field.required} />;
            }
            if (field.type === 'upload' || field.type === 'photo') {
              return (
                <PhotoField
                  key={field.key}
                  label={field.label}
                  value={customFiles[field.key] || null}
                  required={field.required}
                  mode={field.type === 'upload' ? 'upload' : 'photo'}
                  onChange={(file) => setCustomFiles((current) => ({ ...current, [field.key]: file }))}
                />
              );
            }
            if (field.key === 'personToMeet') {
              return (
                <div key={field.key} className="space-y-3">
                  <SelectField
                    label={field.label}
                    icon={UserIcon}
                    plain
                    optional={!field.required}
                    placeholder="Select person to meet"
                    value={personChoice}
                    options={personOptions}
                    onChange={(event) => {
                      const next = event.target.value;
                      setPersonChoice(next);
                      if (next !== '__other__') setOtherPerson('');
                    }}
                  />
                  {personChoice === '__other__' ? (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-fog">
                        Other name
                        {field.required ? <span className="text-danger"> *</span> : null}
                      </span>
                      <input
                        className="field-input !pl-4"
                        type="text"
                        maxLength={80}
                        value={otherPerson}
                        required={field.required}
                        placeholder="Enter person name"
                        onChange={(event) => setOtherPerson(event.target.value)}
                      />
                    </label>
                  ) : null}
                  {field.required ? (
                    <input
                      className="sr-only"
                      tabIndex={-1}
                      required
                      value={personChoice === '__other__' ? otherPerson.trim() : personChoice}
                      onChange={() => undefined}
                    />
                  ) : null}
                </div>
              );
            }
            if (field.type === 'textarea') {
              return (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-fog">
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                  </span>
                  <textarea
                    className="field-input min-h-24 !pl-4"
                    value={values[field.key] || ''}
                    required={field.required}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </label>
              );
            }
            return (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-sm font-medium text-fog">
                  {field.label}
                  {field.required ? <span className="text-danger"> *</span> : null}
                </span>
                <input
                  className="field-input !pl-4"
                  type="text"
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  maxLength={80}
                  value={values[field.key] || ''}
                  required={field.required}
                  placeholder={visitInputHint(field.type) || undefined}
                  onChange={(event) => {
                    const next = sanitizeVisitInput(field.type, event.target.value);
                    setValues((current) => ({ ...current, [field.key]: next }));
                  }}
                />
                {visitInputHint(field.type) ? (
                  <span className="mt-1.5 block text-xs text-mute">{visitInputHint(field.type)}</span>
                ) : null}
              </label>
            );
          })}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving...' : 'Submit details'}
        </button>
      </form>
    </CenteredOverlay>
  );
}
