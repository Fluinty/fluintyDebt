/**
 * SMSAPI.pl Client
 * Handles SMS and VMS (Voice Messaging Service) for Poland
 * 
 * API Documentation: https://www.smsapi.pl/docs
 */

const SMSAPI_BASE_URL = 'https://api.smsapi.pl';

interface SMSAPIConfig {
    apiToken: string;
    senderId?: string; // Alpha sender name (e.g., "Windykacja")
}

interface SendSMSParams {
    to: string;          // Phone number in E.164 format (+48...)
    message: string;     // SMS content (max 160 chars for single SMS)
    senderId?: string;   // Override default sender
}

interface SendVMSParams {
    to: string;          // Phone number in E.164 format
    tts: string;         // Text-to-speech content
    ttsLector?: 'ewa' | 'jacek' | 'jan' | 'maja'; // Polish TTS voices
}

interface SMSAPIResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    details?: Record<string, unknown>;
}

interface DeliveryStatus {
    status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'expired';
    deliveredAt?: string;
    error?: string;
}

/**
 * Get SMSAPI configuration from environment
 */
function getConfig(): SMSAPIConfig {
    const apiToken = process.env.SMSAPI_TOKEN;

    if (!apiToken) {
        throw new Error('SMSAPI_TOKEN is not configured');
    }

    return {
        apiToken,
        senderId: process.env.SMSAPI_SENDER_ID || 'Test',
    };
}

/**
 * Normalize phone number to E.164 format
 * Adds +48 prefix for Polish numbers without country code
 */
export function normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 00, replace with +
    if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
    }

    // If no country code, assume Poland (+48)
    if (!cleaned.startsWith('+')) {
        // Remove leading 0 if present (Polish local format)
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        cleaned = '+48' + cleaned;
    }

    return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
    const normalized = normalizePhoneNumber(phone);
    // E.164: + followed by 1-15 digits
    return /^\+[1-9]\d{6,14}$/.test(normalized);
}

/**
 * Check if current time is within allowed calling hours (8:00-20:00 Warsaw)
 */
export function isWithinCallingHours(): boolean {
    const now = new Date();
    const warsawTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    const hours = warsawTime.getHours();
    return hours >= 8 && hours < 20;
}

/**
 * Send SMS via SMSAPI
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSAPIResponse> {
    try {
        const config = getConfig();
        const normalizedPhone = normalizePhoneNumber(params.to);

        if (!isValidPhoneNumber(params.to)) {
            return {
                success: false,
                error: 'Nieprawidłowy numer telefonu',
            };
        }

        const formData = new URLSearchParams();
        formData.append('to', normalizedPhone);
        formData.append('message', params.message);
        formData.append('from', params.senderId || config.senderId || 'Windykacja');
        formData.append('format', 'json');
        formData.append('encoding', 'utf-8');

        const response = await fetch(`${SMSAPI_BASE_URL}/sms.do`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json();

        if (data.error) {
            console.error('[SMSAPI] SMS Error:', data.error, data.message);
            return {
                success: false,
                error: data.message || 'Błąd wysyłki SMS',
                details: data,
            };
        }

        // SMSAPI returns list of messages sent
        const messageId = data.list?.[0]?.id;

        console.log('[SMSAPI] SMS sent successfully:', messageId);
        return {
            success: true,
            messageId,
        };

    } catch (error) {
        console.error('[SMSAPI] SMS Exception:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Nieznany błąd',
        };
    }
}

/**
 * Send VMS (Voice Message) via SMSAPI
 * Uses Text-to-Speech to call the recipient and read the message
 */
export async function sendVoiceCall(params: SendVMSParams): Promise<SMSAPIResponse> {
    try {
        const config = getConfig();
        const normalizedPhone = normalizePhoneNumber(params.to);

        if (!isValidPhoneNumber(params.to)) {
            return {
                success: false,
                error: 'Nieprawidłowy numer telefonu',
            };
        }

        // Check calling hours
        if (!isWithinCallingHours()) {
            return {
                success: false,
                error: 'Połączenia głosowe są dozwolone tylko w godzinach 8:00-20:00',
            };
        }

        const formData = new URLSearchParams();
        formData.append('to', normalizedPhone);
        formData.append('tts', params.tts);
        formData.append('tts_lector', params.ttsLector || 'maja'); // Female Polish voice
        formData.append('format', 'json');

        const response = await fetch(`${SMSAPI_BASE_URL}/vms.do`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json();

        if (data.error) {
            console.error('[SMSAPI] VMS Error:', data.error, data.message);
            return {
                success: false,
                error: data.message || 'Błąd połączenia głosowego',
                details: data,
            };
        }

        const messageId = data.list?.[0]?.id;

        console.log('[SMSAPI] VMS call initiated:', messageId);
        return {
            success: true,
            messageId,
        };

    } catch (error) {
        console.error('[SMSAPI] VMS Exception:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Nieznany błąd',
        };
    }
}

/**
 * Check delivery status of a message
 */
export async function checkDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    try {
        const config = getConfig();

        const response = await fetch(
            `${SMSAPI_BASE_URL}/sms.do?status=${messageId}&format=json`,
            {
                headers: {
                    'Authorization': `Bearer ${config.apiToken}`,
                },
            }
        );

        const data = await response.json();

        if (data.error) {
            return {
                status: 'failed',
                error: data.message,
            };
        }

        // Map SMSAPI status to our status
        const statusMap: Record<string, DeliveryStatus['status']> = {
            'QUEUE': 'queued',
            'SENT': 'sent',
            'DELIVERED': 'delivered',
            'NOT_DELIVERED': 'undelivered',
            'FAILED': 'failed',
            'EXPIRED': 'expired',
        };

        return {
            status: statusMap[data.status] || 'queued',
            deliveredAt: data.date_sent,
        };

    } catch (error) {
        console.error('[SMSAPI] Status check error:', error);
        return {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Błąd sprawdzania statusu',
        };
    }
}

/**
 * Check account balance/points
 */
export async function getAccountBalance(): Promise<{ points: number; error?: string }> {
    try {
        const config = getConfig();

        const response = await fetch(`${SMSAPI_BASE_URL}/user.do?credits=1&format=json`, {
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
            },
        });

        const data = await response.json();

        if (data.error) {
            return { points: 0, error: data.message };
        }

        return { points: parseFloat(data.points) || 0 };

    } catch (error) {
        return { points: 0, error: 'Błąd połączenia z SMSAPI' };
    }
}

/**
 * Test SMS connection (sends a test message)
 */
export async function sendTestSMS(to: string): Promise<SMSAPIResponse> {
    return sendSMS({
        to,
        message: 'Test wiadomości SMS z systemu FluintyDebt. Jeśli otrzymałeś tę wiadomość, konfiguracja jest poprawna.',
    });
}

/**
 * Test VMS connection (makes a test call)
 */
export async function sendTestVoiceCall(to: string): Promise<SMSAPIResponse> {
    return sendVoiceCall({
        to,
        tts: 'Dzień dobry. To jest testowe połączenie z systemu windykacyjnego. Jeśli słyszysz tę wiadomość, konfiguracja głosowa jest poprawna. Dziękuję.',
    });
}
