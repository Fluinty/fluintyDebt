/**
 * KSeF API Client - Real Implementation for KSeF 2.0
 * 
 * Based on official documentation: https://api-test.ksef.mf.gov.pl/docs/v2/index.html
 * 
 * Authentication flow:
 * 1. GET /security/public-key-certificates - get RSA public key
 * 2. POST /auth/challenge - get challenge & timestamp
 * 3. Encrypt token|timestampMs with RSA-OAEP SHA-256
 * 4. POST /auth/ksef-token - authenticate with encrypted token
 * 5. POST /auth/token/redeem - get accessToken JWT
 * 6. Use accessToken in Authorization: Bearer header for API calls
 */

import type {
    KSeFEnvironment,
    KSeFInvoiceListResponse,
    KSeFInvoiceHeader,
    KSeFSession,
    KSeFConnectionTestResult,
} from './types';
import * as crypto from 'crypto';

// API URLs for KSeF 2.0
const API_URLS: Record<KSeFEnvironment, string> = {
    test: 'https://api-test.ksef.mf.gov.pl/v2',
    production: 'https://api.ksef.mf.gov.pl/v2',
};

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        console.log(`[KSeF] Fetching: ${url}`);
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log(`[KSeF] Response status: ${response.status}`);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    }
}

/**
 * Encrypt token|timestamp with RSA-OAEP SHA-256 for KSeF authentication
 */
function encryptTokenForKSeF(token: string, timestampMs: number, certificatePem: string): string {
    try {
        const dataToEncrypt = `${token}|${timestampMs}`;
        console.log(`[KSeF] Encrypting: ${dataToEncrypt.substring(0, 50)}...`);

        const dataBuffer = Buffer.from(dataToEncrypt, 'utf-8');

        const encrypted = crypto.publicEncrypt(
            {
                key: certificatePem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            dataBuffer
        );

        return encrypted.toString('base64');
    } catch (error) {
        console.error('[KSeF] Encryption failed:', error);
        throw error;
    }
}

export class KSeFClient {
    private environment: KSeFEnvironment;
    private token: string;
    private baseUrl: string;
    private session: KSeFSession | null = null;
    private accessToken: string | null = null;
    private originalToken: string | null = null;

    constructor(token: string, environment: KSeFEnvironment = 'test') {
        this.token = token;
        this.environment = environment;
        this.baseUrl = API_URLS[environment];
        console.log(`[KSeF] Client created for ${environment}`);
    }

    /**
     * Test connection to KSeF API
     */
    async testConnection(): Promise<KSeFConnectionTestResult> {
        try {
            if (!this.token || this.token.length < 10) {
                return {
                    success: false,
                    environment: this.environment,
                    message: 'Nieprawidłowy token KSeF',
                    error: 'Token jest zbyt krótki lub pusty',
                };
            }

            const session = await this.initSession();

            if (session && this.accessToken) {
                return {
                    success: true,
                    environment: this.environment,
                    message: `Połączenie z KSeF (${this.environment}) pomyślne`,
                };
            } else {
                return {
                    success: false,
                    environment: this.environment,
                    message: 'Nie udało się nawiązać sesji z KSeF',
                    error: 'Session initialization failed',
                };
            }
        } catch (error) {
            console.error('[KSeF] Connection test failed:', error);
            return {
                success: false,
                environment: this.environment,
                message: 'Błąd połączenia z KSeF',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Extract NIP from token format: DATE-XX-XXX-XX|nip-XXXXXXXXXX|hash
     */
    private extractNipFromToken(): string {
        const parts = this.token.split('|');
        for (const part of parts) {
            if (part.startsWith('nip-')) {
                return part.replace('nip-', '');
            }
        }
        return '';
    }

    /**
     * Initialize session with KSeF using official API flow
     */
    async initSession(): Promise<KSeFSession | null> {
        try {
            console.log(`[KSeF] Initializing session...`);
            const nip = this.extractNipFromToken();
            console.log(`[KSeF] NIP: ${nip}`);

            // Step 1: Get public key certificate for encryption
            const publicKeyResponse = await fetchWithTimeout(`${this.baseUrl}/security/public-key-certificates`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            }, 10000);

            if (!publicKeyResponse.ok) {
                throw new Error(`Failed to get public key: ${publicKeyResponse.status}`);
            }

            const keyData = await publicKeyResponse.json();
            const certs = Array.isArray(keyData) ? keyData : keyData.certificates || [];

            if (certs.length === 0 || !certs[0].certificate) {
                throw new Error('No certificate found in response');
            }

            const certB64 = certs[0].certificate;
            const certificatePem = `-----BEGIN CERTIFICATE-----\n${certB64}\n-----END CERTIFICATE-----`;
            console.log('[KSeF] Certificate obtained');

            // Step 2: Get challenge
            const challengeResponse = await fetchWithTimeout(`${this.baseUrl}/auth/challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    contextIdentifier: {
                        type: 'Nip',  // Official format from docs
                        value: nip,
                    },
                }),
            }, 15000);

            if (!challengeResponse.ok) {
                const errorText = await challengeResponse.text();
                console.error('[KSeF] Challenge failed:', challengeResponse.status, errorText.substring(0, 200));
                throw new Error(`Challenge failed: ${challengeResponse.status}`);
            }

            const challengeData = await challengeResponse.json();
            console.log('[KSeF] Challenge received:', challengeData.challenge?.substring(0, 30) + '...');
            const timestampMs = challengeData.timestampMs || Date.now();

            // Step 3: Encrypt token|timestampMs
            const encryptedToken = encryptTokenForKSeF(this.token, timestampMs, certificatePem);
            console.log('[KSeF] Token encrypted successfully');

            // Step 4: Authenticate with encrypted token
            const authResponse = await fetchWithTimeout(`${this.baseUrl}/auth/ksef-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    challenge: challengeData.challenge,
                    contextIdentifier: {
                        type: 'Nip',
                        value: nip,
                    },
                    encryptedToken: encryptedToken,
                }),
            }, 15000);

            if (!authResponse.ok) {
                const errorText = await authResponse.text();
                console.error('[KSeF] Auth failed:', authResponse.status, errorText.substring(0, 300));
                throw new Error(`Auth failed: ${authResponse.status} - ${errorText.substring(0, 100)}`);
            }

            const authData = await authResponse.json();
            console.log('[KSeF] Auth response:', JSON.stringify(authData).substring(0, 200));

            // Get the authentication token from response
            const authToken = authData.authenticationToken?.token || authData.authenticationToken;

            if (!authToken) {
                console.error('[KSeF] No authenticationToken in response');
                throw new Error('No authenticationToken in response');
            }

            // Step 5: Redeem token to get accessToken
            // Wait a bit for async token activation (202 means accepted for processing)
            console.log('[KSeF] Waiting 2s for token activation...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('[KSeF] Redeeming authToken for accessToken...');
            const redeemResponse = await fetchWithTimeout(`${this.baseUrl}/auth/token/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({}),
            }, 15000);

            if (!redeemResponse.ok) {
                const errorText = await redeemResponse.text();
                console.error('[KSeF] Token redeem failed:', redeemResponse.status);
                console.error('[KSeF] Redeem error:', errorText.substring(0, 400));
                // If redeem fails, use authentication token from ksef-token response
                console.log('[KSeF] Will use authToken for API calls');
                this.accessToken = authToken;
                // Store original API token for potential SessionToken auth
                this.originalToken = this.token;
            } else {
                const redeemData = await redeemResponse.json();
                console.log('[KSeF] Redeem response keys:', Object.keys(redeemData));
                console.log('[KSeF] Redeem response:', JSON.stringify(redeemData).substring(0, 400));

                // Try to extract accessToken from various possible response structures
                let accessTokenValue = redeemData.accessToken;
                if (typeof accessTokenValue === 'object' && accessTokenValue !== null) {
                    accessTokenValue = accessTokenValue.token || accessTokenValue.value;
                }

                this.accessToken = accessTokenValue || redeemData.token || authToken;
                console.log('[KSeF] Using accessToken type:', typeof this.accessToken);
            }

            console.log('[KSeF] Session initialized successfully');
            this.session = {
                sessionToken: this.accessToken || '',
                referenceNumber: 'SESSION-' + Date.now(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            };

            return this.session;

        } catch (error) {
            console.error('[KSeF] Session init failed:', error);
            return null;
        }
    }

    /**
     * Fetch invoices from KSeF with pagination support
     */
    async fetchInvoices(params: {
        dateFrom: Date;
        dateTo: Date;
        pageSize?: number;
        pageOffset?: number;
        subjectType?: 'Subject1' | 'Subject2'; // Subject1 = Sales, Subject2 = Purchase
    }): Promise<KSeFInvoiceListResponse | null> {
        try {
            if (!this.session || !this.accessToken) {
                await this.initSession();
            }

            if (!this.accessToken) {
                console.error('[KSeF] No access token available');
                return null;
            }

            const dateFromStr = params.dateFrom.toISOString();
            const dateToStr = params.dateTo.toISOString();
            const pageSize = params.pageSize || 500; // Increased to reduce requests
            const subjectType = params.subjectType || 'Subject1';

            console.log(`[KSeF] Fetching invoices (${subjectType}) from ${dateFromStr.split('T')[0]} to ${dateToStr.split('T')[0]}`);

            // Collect all invoices from all pages
            const allInvoices: unknown[] = [];
            let hasMore = true;
            let pageOffset = params.pageOffset || 0;
            let pageCount = 0;
            const maxPages = 50; // Safety limit

            while (hasMore && pageCount < maxPages) {
                console.log(`[KSeF] Fetching page ${pageCount + 1}, offset: ${pageOffset}`);

                const queryResponse = await fetchWithTimeout(`${this.baseUrl}/invoices/query/metadata`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                    body: JSON.stringify({
                        subjectType: subjectType,
                        dateRange: {
                            dateType: 'PermanentStorage',
                            from: dateFromStr,
                            to: dateToStr,
                        },
                        sortOrder: 'DESC', // Newest invoices first
                        pageSize: pageSize,
                        pageOffset: pageOffset,
                    }),
                }, 30000);

                // Handle rate limiting
                if (queryResponse.status === 429) {
                    console.warn('[KSeF] Rate limit hit - returning rate limit error');
                    return {
                        timestamp: new Date().toISOString(),
                        referenceNumber: 'RATE_LIMITED',
                        processingCode: 429,
                        processingDescription: 'Przekroczono limit zapytań do KSeF. Spróbuj ponownie za godzinę.',
                        numberOfElements: allInvoices.length,
                        pageSize: pageSize,
                        pageOffset: params.pageOffset || 0,
                        invoiceHeaderList: allInvoices as KSeFInvoiceHeader[],
                    };
                }

                if (!queryResponse.ok) {
                    const errorText = await queryResponse.text();
                    console.error('[KSeF] Invoice query failed:', queryResponse.status, errorText.substring(0, 300));
                    break;
                }

                const data = await queryResponse.json();

                // Get invoices from this page
                const pageInvoices = data.invoices || data.invoiceMetadataList || data.invoiceHeaderList || [];
                console.log(`[KSeF] Page ${pageCount + 1}: found ${pageInvoices.length} invoices`);

                allInvoices.push(...pageInvoices);

                // Check if there are more pages
                hasMore = data.hasMore === true;
                pageOffset += pageInvoices.length;
                pageCount++;

                if (!hasMore) {
                    console.log('[KSeF] No more pages');
                }
            }

            console.log(`[KSeF] Total invoices fetched: ${allInvoices.length} from ${pageCount} page(s)`);

            return {
                timestamp: new Date().toISOString(),
                referenceNumber: this.session?.referenceNumber || 'QUERY',
                processingCode: 200,
                processingDescription: 'OK',
                numberOfElements: allInvoices.length,
                pageSize: pageSize,
                pageOffset: params.pageOffset || 0,
                invoiceHeaderList: allInvoices as KSeFInvoiceHeader[],
            };

        } catch (error) {
            console.error('[KSeF] Fetch invoices failed:', error);
            return {
                timestamp: new Date().toISOString(),
                referenceNumber: 'ERROR',
                processingCode: 500,
                processingDescription: error instanceof Error ? error.message : 'Unknown error',
                numberOfElements: 0,
                pageSize: params.pageSize || 100,
                pageOffset: params.pageOffset || 0,
                invoiceHeaderList: [],
            };
        }
    }

    /**
     * Download invoice XML by reference number
     */
    async getInvoiceXml(ksefReferenceNumber: string): Promise<string | null> {
        try {
            if (!this.session || !this.accessToken) {
                await this.initSession();
            }

            if (!this.accessToken) {
                console.error('[KSeF] No access token available');
                return null;
            }

            console.log(`[KSeF] Fetching XML for invoice: ${ksefReferenceNumber}`);

            const response = await fetchWithTimeout(`${this.baseUrl}/common/invoice/${ksefReferenceNumber}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/xml',
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }, 30000);

            if (!response.ok) {
                console.error('[KSeF] Failed to get invoice XML:', response.status);
                return null;
            }

            const xml = await response.text();
            console.log(`[KSeF] XML downloaded, length: ${xml.length}`);
            return xml;

        } catch (error) {
            console.error('[KSeF] Get invoice XML failed:', error);
            return null;
        }
    }

    getEnvironment(): KSeFEnvironment {
        return this.environment;
    }

    isSessionActive(): boolean {
        if (!this.session || !this.accessToken) return false;
        return this.session.expiresAt > new Date();
    }
}

/**
 * Create KSeF client from user settings
 */
export function createKSeFClient(
    decryptedToken: string,
    environment: KSeFEnvironment
): KSeFClient {
    return new KSeFClient(decryptedToken, environment);
}
