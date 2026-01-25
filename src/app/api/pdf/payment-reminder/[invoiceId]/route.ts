import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { InvoicePDF } from '@/lib/pdf/invoice-template';
import { getPaymentReminderData } from '@/lib/pdf/data-helper';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const { invoiceId } = await params;
        const supabase = await createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get PDF data using shared helper
        const { data, error } = await getPaymentReminderData(invoiceId, user.id);

        if (error || !data) {
            return NextResponse.json({ error: error || 'Invoice not found' }, { status: 404 });
        }

        // Generate PDF using Invoice template
        const pdfBuffer = await renderToBuffer(InvoicePDF({ data, items: data.items }));

        // Return PDF as download
        const filename = `faktura_${data.invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}

