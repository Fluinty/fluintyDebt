/**
 * Communication channel constants
 */

export const CHANNELS = {
    email: {
        value: 'email',
        label: 'Email',
        icon: 'Mail',
    },
    sms: {
        value: 'sms',
        label: 'SMS',
        icon: 'Smartphone',
    },
    both: {
        value: 'both',
        label: 'Email + SMS',
        icon: 'MessageSquare',
    },
} as const;

export type ChannelKey = keyof typeof CHANNELS;
