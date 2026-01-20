import { useQuery } from '@tanstack/react-query';
import { getScanHistory } from '../lib/history';

export function useHistory(limit = 10) {
  return useQuery({
    queryKey: ['scan-history', limit],
    queryFn: () => getScanHistory(limit),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 5, // Auto-refresh history every 5s
  });
}
