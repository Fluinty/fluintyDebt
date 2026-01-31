
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionTier = 'starter' | 'growth' | 'unlimited';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'active_non_renewing';
export type PlanInterval = 'month' | 'year';

export interface Subscription {
    id: string;
    user_id: string;
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    plan_interval: PlanInterval;
    monthly_invoice_limit: number;
    current_period_end: string | null;
    trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
}

export const PRICING_PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 99,
        limit: 20,
        description: 'Dla początkujących',
    },
    growth: {
        id: 'growth',
        name: 'Growth',
        priceMonthly: 199,
        limit: 200,
        description: 'Dla rozwijających się firm',
    },
    unlimited: {
        id: 'unlimited',
        name: 'Unlimited',
        priceMonthly: 399,
        limit: 999999,
        description: 'Dla wymagających',
    },
};

export async function getSubscription(userId: string) {
    const supabase = await createClient();
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

    return subscription as Subscription | null;
}

export async function checkSubscriptionAccess(userId: string) {
    const subscription = await getSubscription(userId);

    if (!subscription) {
        // Safe fallback - if no subscription row, assume expired trial or new user needing init
        return { hasAccess: false, reason: 'no_subscription', subscription: null };
    }

    const now = new Date();

    // Check if Trial
    if (subscription.status === 'trialing') {
        if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now) {
            return { hasAccess: true, reason: 'trial_active', subscription };
        } else {
            return { hasAccess: false, reason: 'trial_expired', subscription };
        }
    }

    // Check if Active
    if (['active', 'active_non_renewing'].includes(subscription.status)) {
        return { hasAccess: true, reason: 'active_subscription', subscription };
    }

    // Check Past Due (grace period? for now block)
    if (subscription.status === 'past_due') {
        return { hasAccess: false, reason: 'past_due', subscription };
    }

    return { hasAccess: false, reason: 'inactive', subscription };
}

export async function canAddInvoice(userId: string, currentCount: number) {
    const { hasAccess, subscription } = await checkSubscriptionAccess(userId);

    if (!hasAccess || !subscription) return false;

    if (subscription.tier === 'unlimited') return true;

    return currentCount < subscription.monthly_invoice_limit;
}
