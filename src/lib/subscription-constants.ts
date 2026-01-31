export type SubscriptionTier = 'starter' | 'growth' | 'unlimited';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'active_non_renewing';
export type PlanInterval = 'month' | 'year';

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
