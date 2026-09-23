import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { HomeElements } from '../components/visit/HomeElements';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { isVisitThemeId, visitThemeClass, type VisitThemeId } from '../lib/visitTheme';
import type { PublicHomeLayout } from '../lib/homeLayout';

type PublicOrgHomePayload = {
  organizationId: string;
  organizationName: string;
  organizationLogo?: string | null;
  homeLayout?: PublicHomeLayout | null;
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
};

export function PublicOrgHome() {
  const { organizationId = '' } = useParams();

  const homeQuery = useQuery({
    queryKey: ['public-org-home', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get(`/public/org/${organizationId}/home`);
      return response.data.data as PublicOrgHomePayload;
    },
    retry: false,
  });

  if (homeQuery.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-mute">Opening home...</p>
      </div>
    );
  }

  if (homeQuery.error || !homeQuery.data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-danger">{getApiErrorMessage(homeQuery.error, 'Home link is not valid.')}</p>
      </div>
    );
  }

  const data = homeQuery.data;
  const theme: VisitThemeId = isVisitThemeId(data.homeLayout?.bgTheme) ? data.homeLayout.bgTheme : 'default';

  return (
    <div className={cn(visitThemeClass(theme), 'min-h-dvh overflow-y-auto px-3 py-5')}>
      <HomeElements
        layout={data.homeLayout}
        organizationName={data.organizationName}
        meetingBoard={data.meetingBoard}
        googleReview={data.googleReview}
      />
    </div>
  );
}
