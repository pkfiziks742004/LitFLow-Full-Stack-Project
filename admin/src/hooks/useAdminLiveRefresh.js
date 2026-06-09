import { useEffect, useRef } from 'react';

export default function useAdminLiveRefresh(onRefresh, { enabled = true, intervalMs = 60_000 } = {}) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const runRefresh = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      refreshRef.current?.();
    };

    const handleFocus = () => {
      runRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefresh();
      }
    };

    const intervalId = window.setInterval(runRefresh, intervalMs);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
