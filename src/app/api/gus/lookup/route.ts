import { NextRequest, NextResponse } from 'next/server';

// GUS REGON API lookup
// Note: This is a simplified implementation. For production, you'd need to:
// 1. Register for official REGON API access at https://api.stat.gov.pl/Home/RegonApi
// 2. Use proper SOAP client or their REST API
// 3. Handle authentication with API key

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const nip = searchParams.get('nip');

    if (!nip || nip.length !== 10) {
        return NextResponse.json(
            { error: 'Invalid NIP - must be 10 digits' },
            { status: 400 }
        );
    }

    try {
        // For now, we'll use a public API that doesn't require authentication
        // In production, replace with official REGON API
        const response = await fetch(
            `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${new Date().toISOString().split('T')[0]}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            // Try alternative - CEIDG for sole proprietors
            return NextResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        const data = await response.json();

        if (data.result?.subject) {
            const subject = data.result.subject;
            return NextResponse.json({
                name: subject.name,
                nip: subject.nip,
                street: subject.workingAddress || subject.residenceAddress || '',
                city: '', // MF API doesn't split address well
                postalCode: '',
                statusVat: subject.statusVat,
            });
        }

        return NextResponse.json(
            { error: 'Company not found in registry' },
            { status: 404 }
        );
    } catch (error) {
        console.error('GUS lookup error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to registry' },
            { status: 500 }
        );
    }
}
