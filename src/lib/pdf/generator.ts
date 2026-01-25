import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/pdf/invoice-template';
import { getPaymentReminderData } from '@/lib/pdf/data-helper';

/**
 * Generate Invoice PDF buffer
 */
export async function generatePaymentReminderPDF(invoiceId: string, userId: string): Promise<{ buffer: Buffer | null; filename?: string; error?: string }> {
    try {
        const { data, error } = await getPaymentReminderData(invoiceId, userId);

        if (error || !data) {
            return { buffer: null, filename: undefined, error: error || 'Failed to get data' };
        }

        // Always use Invoice template (Faktura VAT style)
        const buffer = await renderToBuffer(InvoicePDF({
            data,
            items: data.items
        }));

        // Sanitize invoice number for filename
        const safeInvoiceNumber = data.invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `faktura_${safeInvoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;

        return { buffer, filename };
    } catch (err) {
        console.error('PDF generation error:', err);
        return { buffer: null, filename: undefined, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
