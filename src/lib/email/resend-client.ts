import {
    TransactionalEmailsApi,
    TransactionalEmailsApiApiKeys,
    SendSmtpEmail
} from '@getbrevo/brevo';
import { processPlaceholders } from '@/lib/utils/process-placeholders';

// Validated Sender
const SENDER_EMAIL = process.env.BREVO_FROM_EMAIL || 'adam@fluinty.pl';
const SENDER_NAME = process.env.BREVO_FROM_NAME || 'FluintyDebt';

// Lazy initialize Brevo client
let brevoClient: TransactionalEmailsApi | null = null;

function getBrevoClient(): TransactionalEmailsApi {
    if (!brevoClient) {
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            console.error('ERROR: BREVO_API_KEY is missing');
            throw new Error('Konfiguracja Email (Brevo) jest niekompletna: Brak klucza API.');
        }
        brevoClient = new TransactionalEmailsApi();
        brevoClient.setApiKey(
            TransactionalEmailsApiApiKeys.apiKey,
            apiKey
        );
    }
    return brevoClient;
}

// Re-export processPlaceholders for convenience
export { processPlaceholders };

/**
 * Send a collection email using Brevo (formerly Sendinblue)
 * Keeps the same signature as the previous Resend implementation
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

        const client = getBrevoClient();
        const sendSmtpEmail = new SendSmtpEmail();

        sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
        sendSmtpEmail.to = [{ email: params.to }];
        sendSmtpEmail.subject = processedSubject;
        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                ${htmlBody}
            </div>
        `;
        sendSmtpEmail.textContent = processedBody; // Plain text fallback

        // Handle Attachments
        if (params.attachments && params.attachments.length > 0) {
            sendSmtpEmail.attachment = params.attachments.map(att => ({
                name: att.filename,
                content: att.content.toString('base64')
            }));
        }

        const data = await client.sendTransacEmail(sendSmtpEmail);

        // Brevo returns { messageId: "<...>" }
        // @ts-ignore - The types might slightly mismatch depending on version, casting safely
        const msgId = data.messageId || (data as any).id;

        return { success: true, messageId: msgId };

    } catch (err: any) {
        console.error('Brevo Email send error:', err);
        // Extract error message safely
        const errorMessage = err.body?.message || err.message || 'Unknown error';
        return { success: false, error: errorMessage };
    }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return sendCollectionEmail({
        to,
        subject: 'Test FluintyDebt - Konfiguracja działa (Brevo)!',
        body: `Cześć!
        
To jest testowy email z FluintyDebt (wysłany przez Brevo).

Jeśli widzisz tę wiadomość, integracja działa poprawnie!

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
