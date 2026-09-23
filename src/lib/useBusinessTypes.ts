import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { BUSINESS_TYPES } from './constants';

type BusinessTypesPayload = { types: string[] };

function withOtherLast(types: string[]) {
  const rest: string[] = [];
  const others: string[] = [];
  for (const type of types) {
    if (String(type).trim().toLowerCase() === 'other') others.push(type);
    else rest.push(type);
  }
  return [...rest, ...others];
}

/** Public list for signup / profile. Falls back to built-in defaults while loading. */
export function useBusinessTypes() {
  const query = useQuery({
    queryKey: ['business-types'],
    queryFn: async () => {
      const response = await api.get('/business-types');
      return response.data.data as BusinessTypesPayload;
    },
    staleTime: 60_000,
  });

  const raw =
    query.data?.types && query.data.types.length > 0
      ? query.data.types
      : query.isSuccess
        ? []
        : [...BUSINESS_TYPES];

  return {
    types: withOtherLast(raw),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
