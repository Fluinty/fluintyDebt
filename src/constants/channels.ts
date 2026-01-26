/**
 * Communication channel constants
 */

export const CHANNELS = {
    email: {
        value: 'email',
        label: 'Email',
        icon: 'Mail',
    },
} as const;

export type ChannelKey = keyof typeof CHANNELS;
