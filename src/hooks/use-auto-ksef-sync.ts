'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook that checks every minute if automatic KSeF sync should run
 * Triggers sync when current time >= configured sync_time and not synced today
 */
export function useAutoKSeFSync() {
    const lastCheckRef = useRef<string>('');

    useEffect(() => {
        // Check every minute
        const checkSync = async () => {
            const now = new Date();
            const currentTime = now.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const today = now.toISOString().split('T')[0];

            // Avoid checking multiple times in same minute
            const checkKey = `${today}-${currentTime}`;
            if (lastCheckRef.current === checkKey) return;
            lastCheckRef.current = checkKey;

            console.log(`[AutoSync] Checking at ${currentTime}`);

            try {
                // Call the cron endpoint
                const response = await fetch('/api/cron/ksef-sync');
                const data = await response.json();

                if (data.usersSynced > 0) {
                    console.log(`[AutoSync] Synced ${data.usersSynced} users, ${data.invoicesTotal} invoices`);
                }
            } catch (err) {
                console.error('[AutoSync] Error:', err);
            }
        };

        // Check immediately
        checkSync();

        // Check every 60 seconds
        const interval = setInterval(checkSync, 60000);

        return () => clearInterval(interval);
    }, []);
}
