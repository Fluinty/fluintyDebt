import { Resend } from 'resend';
import { processPlaceholders } from '@/lib/utils/process-placeholders';

// Lazy initialize Resend client (only when actually sending emails)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

// Re-export processPlaceholders for convenience
export { processPlaceholders };

/**
 * Send a collection email using Resend
 */
export async function sendCollectionEmail(params: {
    to: string;
    subject: string;
    body: string;
    invoiceData: {
        invoice_number: string;
        amount: number;
        due_date: string;
        days_overdue?: number;
        debtor_name: string;
        company_name?: string;
        bank_account?: string;
        interest_amount?: number;
        total_with_interest?: number;
    };
    attachments?: {
        filename: string;
        content: Buffer;
    }[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        // Process placeholders in subject and body
        const processedSubject = processPlaceholders(params.subject, params.invoiceData);
        const processedBody = processPlaceholders(params.body, params.invoiceData);

        // Convert plain text body to HTML (preserve line breaks)
        const htmlBody = processedBody
            .replace(/\n/g, '<br>')
            .replace(/\r/g, '');

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'FluintyDebt <onboarding@resend.dev>';

        const { data, error } = await getResendClient().emails.send({
            from: fromEmail,
            to: params.to,
            subject: processedSubject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    ${htmlBody}
                </div>
            `,
            text: processedBody, // Plain text fallback
            attachments: params.attachments,
        });

        if (error) {
            console.error('Resend error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, messageId: data?.id };
    } catch (err) {
        console.error('Email send error:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return sendCollectionEmail({
        to,
        subject: 'Test FluintyDebt - Konfiguracja działa!',
        body: `Cześć!

To jest testowy email z FluintyDebt.

Jeśli widzisz tę wiadomość, integracja z Resend działa poprawnie!

Pozdrawiamy,
Zespół FluintyDebt`,
        invoiceData: {
            invoice_number: 'TEST-001',
            amount: 1000,
            due_date: new Date().toISOString(),
            debtor_name: 'Test Kontrahent',
        },
    });
}
