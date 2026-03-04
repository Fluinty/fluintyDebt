/**
 * KSeF API Client - Real Implementation for KSeF 2.0
 * 
 * Based on official documentation: https://api-test.ksef.mf.gov.pl/docs/v2/index.html
 * 
 * Certificate Authentication flow (XAdES-BES):
 * 1. POST /auth/challenge - get challenge & timestamp
 * 2. Build AuthTokenRequest XML
 * 3. Sign XML with XAdES-BES (enveloped, Exclusive C14N, RSA-SHA256 or ECDSA-SHA256)
 * 4. POST /auth/xades-signature - send signed XML
 * 5. GET /auth/{referenceNumber} - poll for completion (async)
 * 6. POST /auth/token/redeem - get accessToken JWT
 * 7. Use accessToken in Authorization: Bearer header for API calls
 * 
 * Legacy Token Authentication flow:
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
import { DOMParser } from '@xmldom/xmldom';
import { XadesKeyPair, XadesSignatureService, buildAuthTokenRequestXml as ksefBuildAuthTokenRequestXml } from 'ksef-client';
// Require xml-crypto internally to access the canonicalizer
const { ExclusiveCanonicalization } = require('xml-crypto/lib/exclusive-canonicalization');

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

// ============================================================================
// XAdES-BES Signing Helpers
// ============================================================================

/**
 * Exclusive Canonicalization (xml-exc-c14n#) 
 * Using xml-crypto to ensure proper handling of namespaces and attributes
 */
function exclusiveCanonicalizeXml(xmlString: string): string {
    try {
        const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
        // Check for parse errors
        const parseError = doc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
            console.error('[KSeF] XML parse error during C14N:', parseError[0].textContent);
            throw new Error('Invalid XML provided to canonicalizer');
        }

        const c14n = new ExclusiveCanonicalization();
        return c14n.process(doc.documentElement);
    } catch (err) {
        console.error('[KSeF] Canonicalization failed:', err);
        throw err;
    }
}

/**
 * Build the AuthTokenRequest XML document (unsigned)
 * Namespace: http://ksef.mf.gov.pl/auth/token/2.0
 */
function buildAuthTokenRequestXml(challenge: string, nip: string): string {
    return `<AuthTokenRequest xmlns="http://ksef.mf.gov.pl/auth/token/2.0"><Challenge>${challenge}</Challenge><ContextIdentifier><Nip>${nip}</Nip></ContextIdentifier><SubjectIdentifierType>certificateSubject</SubjectIdentifierType></AuthTokenRequest>`;
}

/**
 * Detect key type from PEM private key
 */
function detectKeyType(privateKeyPem: string): 'RSA' | 'EC' {
    if (privateKeyPem.includes('EC PRIVATE KEY') || privateKeyPem.includes('EC PARAMETERS')) {
        return 'EC';
    }
    // Try parsing to detect
    try {
        const keyObj = crypto.createPrivateKey(privateKeyPem);
        return keyObj.asymmetricKeyType === 'ec' ? 'EC' : 'RSA';
    } catch {
        return 'RSA'; // Default to RSA
    }
}

/**
 * Extract DER bytes from PEM certificate
 */
function extractCertDer(certPem: string): Buffer {
    const b64 = certPem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '');
    return Buffer.from(b64, 'base64');
}

/**
 * Compute SHA-256 digest and return as Base64
 */
function sha256Base64(data: Buffer | string): string {
    const hash = crypto.createHash('sha256');
    hash.update(typeof data === 'string' ? Buffer.from(data, 'utf-8') : data);
    return hash.digest('base64');
}

/**
 * Convert hex string to decimal string (for X509SerialNumber which must be decimal per XSD)
 */
function hexToDecimal(hex: string): string {
    // Remove any colons or spaces from hex string
    const cleanHex = hex.replace(/[:\s]/g, '');
    // Use BigInt for large serial numbers
    return BigInt('0x' + cleanHex).toString(10);
}

/**
 * Normalize issuer name to RFC 2253 / XAdES format
 * Node.js returns multi-line format like "C=PL\nO=Company\nCN=Name"
 * XAdES expects comma-separated: "CN=Name,O=Company,C=PL"
 */
function normalizeIssuerName(issuer: string): string {
    // Split by newline, reverse (to get CN first per RFC 2253), join with comma
    const parts = issuer.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    // KSeF API expects root-to-leaf format (e.g. C=PL,O=Ministerstwo,CN=...)
    return parts.join(',');
}

/**
 * Extract issuer and serial from a PEM certificate for SigningCertificate
 */
function extractCertInfo(certPem: string): { issuerName: string; serialNumber: string } {
    try {
        const x509 = new crypto.X509Certificate(certPem);
        const serialDecimal = hexToDecimal(x509.serialNumber);
        const issuerNormalized = normalizeIssuerName(x509.issuer);

        console.log(`[KSeF] Cert serial (hex): ${x509.serialNumber} → (dec): ${serialDecimal}`);
        console.log(`[KSeF] Cert issuer: ${issuerNormalized}`);

        return {
            issuerName: issuerNormalized,
            serialNumber: serialDecimal,
        };
    } catch (e) {
        console.error('[KSeF] Failed to extract cert info:', e);
        return { issuerName: 'Unknown', serialNumber: '0' };
    }
}

/**
 * Sign XML with XAdES-BES enveloped signature (KSeF compliant)
 * 
 * Produces an enveloped XAdES-BES signature with:
 * - Exclusive Canonicalization
 * - RSA-SHA256 or ECDSA-SHA256
 * - Reference to document (URI="") with enveloped-signature transform
 * - Reference to SignedProperties
 * - KeyInfo with X509Certificate
 * - QualifyingProperties with SigningTime + SigningCertificate
 */
/**
 * Sign XML with XAdES-BES enveloped signature (KSeF compliant)
 */
function signXmlWithXAdES(
    xml: string,
    certificatePem: string,
    privateKeyPem: string,
    password?: string
): string {
    const keyType = detectKeyType(privateKeyPem);
    const signatureAlgorithm = keyType === 'EC'
        ? 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256'
        : 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    const canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    const digestAlgorithm = 'http://www.w3.org/2001/04/xmlenc#sha256';
    const signedPropertiesId = 'SignedProperties-' + crypto.randomUUID().substring(0, 8);
    const signatureId = 'Signature-' + crypto.randomUUID().substring(0, 8);

    console.log(`[KSeF XAdES] Key type: ${keyType}, Algorithm: ${signatureAlgorithm}`);

    // Certificate info
    const certDer = extractCertDer(certificatePem);
    const certB64 = certDer.toString('base64');
    const certDigest = sha256Base64(certDer);
    const certInfo = extractCertInfo(certificatePem);
    const signingTime = new Date().toISOString();

    const signedPropertiesStr = `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signedPropertiesId}"><xades:SignedSignatureProperties><xades:SigningTime>${signingTime}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm="${digestAlgorithm}"></ds:DigestMethod><ds:DigestValue>${certDigest}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName>${certInfo.issuerName}</ds:X509IssuerName><ds:X509SerialNumber>${certInfo.serialNumber}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate></xades:SignedSignatureProperties></xades:SignedProperties>`;

    // We require SignedXml inline since we just installed xml-crypto
    const { SignedXml } = require('xml-crypto');
    const sig = new SignedXml();
    sig.signatureAlgorithm = signatureAlgorithm;
    sig.canonicalizationAlgorithm = canonicalizationAlgorithm;

    // 1. Reference to Document (enveloped signature + Exc-C14N)
    sig.addReference({
        xpath: "//*[local-name(.)='AuthTokenRequest']",
        transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", canonicalizationAlgorithm],
        digestAlgorithm: digestAlgorithm,
        uri: "",
        isEmptyUri: true
    });

    // xml-crypto defaults to URI="" when not provided, but we can explicitly set it to empty
    sig.references[0].uri = "";

    // 2. Reference to SignedProperties (Exc-C14N)
    sig.addReference({
        xpath: `//*[@Id="${signedPropertiesId}"]`,
        transforms: [canonicalizationAlgorithm],
        digestAlgorithm: digestAlgorithm,
        uri: `#${signedPropertiesId}`,
        isEmptyUri: false
    });
    // Explicitly set the Type as required by XAdES
    sig.references[1].type = "http://uri.etsi.org/01903#SignedProperties";

    // 3. Inject KeyInfo and the QualifyingProperties
    sig.getKeyInfoContent = function () {
        return `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`;
    };


    sig.privateKey = privateKeyPem;
    if (password) {
        sig.privateKey = { key: privateKeyPem, passphrase: password } as any;
    }

    // XAdES Object wrapper
    const xadesObjectStr = `<ds:Object><xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${signatureId}">${signedPropertiesStr}</xades:QualifyingProperties></ds:Object>`;

    try {
        const closingTag = '</AuthTokenRequest>';
        // xml-crypto xpath evaluation requires the object to be in the document.
        // Insert the signature with NO extra newlines before closing tag.
        const docWithObjectForSigning = xml.replace(closingTag, `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">${xadesObjectStr}</ds:Signature>${closingTag}`);

        sig.computeSignature(docWithObjectForSigning, {
            prefix: 'ds',
            location: { reference: "//*[local-name(.)='AuthTokenRequest']/*[last()]", action: "after" }
        });

        let signatureXml = sig.getSignatureXml();
        signatureXml = signatureXml.replace('</ds:Signature>', `${xadesObjectStr}</ds:Signature>`);

        // xml-crypto natively drops the 'Type' attribute on references. KSeF strictly requires it for SignedProperties.
        signatureXml = signatureXml.replace(
            `<ds:Reference URI="#${signedPropertiesId}">`,
            `<ds:Reference URI="#${signedPropertiesId}" Type="http://uri.etsi.org/01903#SignedProperties">`
        );

        // Convert ECDSA for KSeF
        let finalSignatureXml = signatureXml;
        if (keyType === 'EC') {
            const sigValueMatch = finalSignatureXml.match(/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/);
            if (sigValueMatch) {
                const b64Value = sigValueMatch[1];
                const sigBuf = Buffer.from(b64Value, 'base64');
                if (sigBuf[0] === 0x30) {
                    const p1363Buf = convertEcDerToP1363(sigBuf);
                    const newB64Value = p1363Buf.toString('base64');
                    finalSignatureXml = finalSignatureXml.replace(b64Value, newB64Value);
                    console.log(`[KSeF XAdES] Converted ECDSA DER to P1363`);
                }
            }
        }

        finalSignatureXml = finalSignatureXml.replace('<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">', `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">`);

        const finalXml = xml.replace(closingTag, finalSignatureXml + closingTag);

        console.log(`[KSeF XAdES] Signed XML created with xml-crypto, length: ${finalXml.length}`);
        return finalXml;

    } catch (err) {
        console.error('[KSeF XAdES] xml-crypto signing error:', err);
        throw err;
    }
}

/**
 * Convert ECDSA DER signature to P1363 (R||S) format
 * KSeF requires R||S concatenation per XMLDSIG 1.1 / RFC 4050
 */
function convertEcDerToP1363(derSignature: Buffer): Buffer {
    // DER format: SEQUENCE { INTEGER r, INTEGER s }
    let offset = 0;

    // Skip SEQUENCE tag and length
    if (derSignature[offset] !== 0x30) throw new Error('Invalid DER signature');
    offset++;
    if (derSignature[offset] & 0x80) {
        offset += (derSignature[offset] & 0x7f) + 1;
    } else {
        offset++;
    }

    // Read R
    if (derSignature[offset] !== 0x02) throw new Error('Invalid DER: expected INTEGER for R');
    offset++;
    const rLength = derSignature[offset];
    offset++;
    let r = derSignature.subarray(offset, offset + rLength);
    offset += rLength;
    // Strip leading zero
    if (r[0] === 0x00) r = r.subarray(1);

    // Read S
    if (derSignature[offset] !== 0x02) throw new Error('Invalid DER: expected INTEGER for S');
    offset++;
    const sLength = derSignature[offset];
    offset++;
    let s = derSignature.subarray(offset, offset + sLength);
    if (s[0] === 0x00) s = s.subarray(1);

    // Pad to 32 bytes each (for P-256)
    const componentLength = 32;
    const rPadded = Buffer.alloc(componentLength);
    r.copy(rPadded, componentLength - r.length);
    const sPadded = Buffer.alloc(componentLength);
    s.copy(sPadded, componentLength - s.length);

    return Buffer.concat([rPadded, sPadded]);
}

/**
 * Encrypt token|timestamp with RSA-OAEP SHA-256 for KSeF legacy token authentication
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

// ============================================================================
// KSeF Client
// ============================================================================

export class KSeFClient {
    private environment: KSeFEnvironment;
    private token: string;
    private baseUrl: string;
    private session: KSeFSession | null = null;
    private accessToken: string | null = null;

    // Certificate Auth Props
    private certificate: string | undefined;
    private privateKey: string | undefined;
    private privateKeyPassword: string | undefined;
    private nip: string | undefined;

    constructor(token: string, environment?: KSeFEnvironment);
    constructor(config: {
        environment: KSeFEnvironment;
        certificate?: string;
        privateKey?: string;
        privateKeyPassword?: string;
        nip?: string;
        token?: string;
    });
    constructor(configOrToken: any, environment?: KSeFEnvironment) {
        if (typeof configOrToken === 'string') {
            this.token = configOrToken;
            this.environment = environment || 'test';
        } else {
            this.environment = configOrToken.environment;
            this.token = configOrToken.token || '';
            this.certificate = configOrToken.certificate;
            this.privateKey = configOrToken.privateKey;
            this.privateKeyPassword = configOrToken.privateKeyPassword;
            this.nip = configOrToken.nip;
        }

        this.baseUrl = API_URLS[this.environment];
        console.log(`[KSeF] Client created for ${this.environment}`);
    }

    /**
     * Validate loaded credentials
     */
    validateCredentials(): { success: boolean; message: string } {
        if (this.token && this.token.length > 10) {
            return { success: true, message: 'Użyto tokenu autoryzacyjnego' };
        }

        if (!this.certificate) {
            return { success: false, message: 'Brak certyfikatu' };
        }
        if (!this.privateKey) {
            return { success: false, message: 'Brak klucza prywatnego' };
        }

        // Basic format check
        if (!this.certificate.includes('-----BEGIN CERTIFICATE-----')) {
            return { success: false, message: 'Nieprawidłowy format certyfikatu (oczekiwano PEM)' };
        }
        if (!this.privateKey.includes('-----BEGIN') && !this.privateKey.includes('PRIVATE KEY')) {
            return { success: false, message: 'Nieprawidłowy format klucza (oczekiwano PEM)' };
        }

        return { success: true, message: 'Certyfikat i klucz wyglądają poprawnie' };
    }

    /**
     * Test connection to KSeF API
     */
    async testConnection(): Promise<KSeFConnectionTestResult> {
        try {
            // Check if we have ANY credentials
            const validation = this.validateCredentials();
            if (!validation.success) {
                return {
                    success: false,
                    environment: this.environment,
                    message: 'Błąd walidacji poświadczeń',
                    error: validation.message,
                };
            }

            const session = await this.initSession();

            if (session && this.accessToken) {
                return {
                    success: true,
                    environment: this.environment,
                    message: `Połączenie z KSeF (${this.environment}) pomyślne`,
                    sessionInfo: {
                        referenceNumber: session.referenceNumber,
                        nip: this.nip || this.extractNipFromToken() || '',
                    }
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
     * Extract NIP from token or return stored NIP
     */
    private extractNipFromToken(): string {
        if (this.nip) return this.nip;

        if (this.token) {
            const parts = this.token.split('|');
            for (const part of parts) {
                if (part.startsWith('nip-')) {
                    return part.replace('nip-', '');
                }
            }
        }
        return '';
    }

    /**
     * Initialize session - dispatches to certificate or token flow
     */
    async initSession(): Promise<KSeFSession | null> {
        // Certificate auth takes priority
        if (this.certificate && this.privateKey) {
            console.log('[KSeF] Using certificate-based XAdES authentication');
            return this.initSessionWithCertificate();
        }

        if (this.token && this.token.length > 10) {
            console.log('[KSeF] Using legacy token-based authentication');
            return this.initSessionWithToken();
        }

        console.error('[KSeF] No valid credentials available');
        return null;
    }

    /**
     * Initialize session with XAdES-BES certificate signing (KSeF 2.0)
     * 
     * Flow:
     * 1. POST /auth/challenge → challenge + timestamp
     * 2. Build AuthTokenRequest XML
     * 3. Sign with XAdES-BES
     * 4. POST /auth/xades-signature → authenticationToken + referenceNumber
     * 5. Poll GET /auth/{ref} until complete
     * 6. POST /auth/token/redeem → accessToken JWT
     */
    private async initSessionWithCertificate(): Promise<KSeFSession | null> {
        try {
            const nip = this.extractNipFromToken();
            console.log(`[KSeF XAdES] Starting certificate auth for NIP: ${nip}`);

            // Step 1: Get challenge
            const challengeResponse = await fetchWithTimeout(`${this.baseUrl}/auth/challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    contextIdentifier: {
                        type: 'Nip',
                        value: nip,
                    },
                }),
            }, 15000);

            if (!challengeResponse.ok) {
                const errorText = await challengeResponse.text();
                console.error('[KSeF XAdES] Challenge failed:', challengeResponse.status, errorText.substring(0, 200));
                throw new Error(`Challenge failed: ${challengeResponse.status}`);
            }

            const challengeData = await challengeResponse.json();
            const challenge = challengeData.challenge;
            console.log(`[KSeF XAdES] Challenge received: ${challenge?.substring(0, 30)}...`);

            // Step 2 & 3: Build AuthTokenRequest XML and Sign with XAdES-BES using ksef-client
            /* --- OLD CUSTOM XML-CRYPTO IMPLEMENTATION ---
            const authTokenRequestXml = buildAuthTokenRequestXml(challenge, nip);
            console.log(`[KSeF XAdES] AuthTokenRequest XML built, length: ${authTokenRequestXml.length}`);

            // Step 3: Sign with XAdES-BES
            const signedXml = signXmlWithXAdES(
                authTokenRequestXml,
                this.certificate!,
                this.privateKey!,
                this.privateKeyPassword
            );
            ------------------------------------------ */

            const keyPair = XadesKeyPair.fromPem({
                certificatePem: this.certificate!,
                privateKeyPem: this.privateKey!,
                privateKeyPassword: this.privateKeyPassword
            });
            const xml = ksefBuildAuthTokenRequestXml({ challenge, contextIdentifierType: 'nip', contextIdentifierValue: nip });
            const signatureService = new XadesSignatureService();
            const signedXml = signatureService.signXadesEnveloped({ xml, keyPair });

            console.log(`[KSeF XAdES] Signed XML built via ksef-client, length: ${signedXml.length}`);

            // Step 4: POST /auth/xades-signature
            console.log('[KSeF XAdES] Sending signed XML to /auth/xades-signature...');
            const authResponse = await fetchWithTimeout(`${this.baseUrl}/auth/xades-signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/xml',
                    'Accept': 'application/json',
                },
                body: signedXml,
            }, 30000);

            if (!authResponse.ok) {
                const errorText = await authResponse.text();
                console.error('[KSeF XAdES] Auth failed:', authResponse.status, errorText.substring(0, 500));
                throw new Error(`XAdES auth failed: ${authResponse.status} - ${errorText.substring(0, 200)}`);
            }

            const authData = await authResponse.json();
            console.log('[KSeF XAdES] Auth response received, referenceNumber:', authData.referenceNumber, 'hasToken:', !!authData.authenticationToken);

            const authToken = authData.authenticationToken?.token || authData.authenticationToken;
            const referenceNumber = authData.referenceNumber;

            if (!authToken) {
                throw new Error('No authenticationToken in XAdES response');
            }
            if (!referenceNumber) {
                throw new Error('No referenceNumber in XAdES response');
            }

            console.log(`[KSeF XAdES] Got authToken and referenceNumber: ${referenceNumber}`);

            // Step 5: Poll GET /auth/{referenceNumber} until authentication completes
            let authComplete = false;
            const maxPolls = 10; // Max 20 seconds (2s interval)
            for (let i = 0; i < maxPolls; i++) {
                console.log(`[KSeF XAdES] Polling auth status (${i + 1}/${maxPolls})...`);

                await new Promise(resolve => setTimeout(resolve, 2000));

                const statusResponse = await fetchWithTimeout(`${this.baseUrl}/auth/${referenceNumber}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                }, 10000);

                if (!statusResponse.ok) {
                    const errText = await statusResponse.text();
                    console.log(`[KSeF XAdES] Status check ${statusResponse.status}: ${errText.substring(0, 200)}`);
                    // 401 might mean token expired or auth is still processing
                    if (statusResponse.status === 401) {
                        continue; // Keep polling
                    }
                    // Other errors might be fatal
                    if (statusResponse.status >= 500) {
                        continue; // Server error, retry
                    }
                    throw new Error(`Auth status check failed: ${statusResponse.status}`);
                }

                const statusData = await statusResponse.json();
                // Log safe summary of status response (never log token values)
                const safeSummary = { referenceNumber: statusData.referenceNumber, statusCode: statusData.status?.code, statusDesc: statusData.status?.description, processingCode: statusData.processingCode, hasToken: !!statusData.authenticationToken };
                console.log(`[KSeF XAdES] Auth status:`, JSON.stringify(safeSummary));

                // KSeF polling DTO structure (from observed responses):
                // {"referenceNumber":"...","authenticationToken":{...},"status":{"code":200,"description":"Uwierzytelnianie zakończone sukcesem"},"isTokenRedeemed":false}
                // OR {"exception":{"exceptionDetailList":[{"exceptionCode":..., "exceptionDescription":"..."}]}}

                let processingCode = statusData.processingCode ?? statusData.status?.code;
                let processingDesc = statusData.processingDescription ?? statusData.status?.description;

                if (statusData.exception?.exceptionDetailList?.length > 0) {
                    const errorDetail = statusData.exception.exceptionDetailList[0];
                    processingCode = errorDetail.exceptionCode;
                    processingDesc = errorDetail.exceptionDescription;
                }

                if (processingCode === 200 || processingDesc?.includes('sukcesem') || processingDesc === 'Gotowe' || processingCode === 201) {
                    authComplete = true;
                    console.log('[KSeF XAdES] Authentication completed successfully!');
                    break;
                }

                // Check if explicitly failed (validation error, invalid signature, etc)
                // Codes: 100-199 (Processing), 200-299 (OK), 400+ (Error)
                if (processingCode >= 400) {
                    throw new Error(`Authentication failed: code=${processingCode}, desc=${processingDesc}`);
                }

                // Still processing (usually 100), continue polling
                console.log(`[KSeF XAdES] Still processing (code: ${processingCode}, desc: ${processingDesc})...`);
            }

            if (!authComplete) {
                console.warn('[KSeF XAdES] Auth polling timeout, attempting redeem anyway...');
            }

            // Step 6: POST /auth/token/redeem to get accessToken JWT
            console.log('[KSeF XAdES] Redeeming token for accessToken...');
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
                const redeemError = await redeemResponse.text();
                console.error('[KSeF XAdES] Token redeem failed:', redeemResponse.status, redeemError.substring(0, 400));
                throw new Error(`Token redeem failed: ${redeemResponse.status} - ${redeemError.substring(0, 200)}`);
            }

            const redeemData = await redeemResponse.json();
            console.log('[KSeF XAdES] Redeem response keys:', Object.keys(redeemData));

            // Extract accessToken from response
            let accessTokenValue = redeemData.accessToken;
            if (typeof accessTokenValue === 'object' && accessTokenValue !== null) {
                accessTokenValue = accessTokenValue.token || accessTokenValue.value;
            }
            this.accessToken = accessTokenValue || redeemData.token;

            if (!this.accessToken) {
                throw new Error('No accessToken in redeem response');
            }

            console.log('[KSeF XAdES] Session initialized successfully with accessToken JWT');

            this.session = {
                sessionToken: this.accessToken,
                referenceNumber: referenceNumber,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            };

            return this.session;

        } catch (error) {
            console.error('[KSeF XAdES] Certificate auth failed:', error);
            throw error; // Propagate real error message to caller
        }
    }

    /**
     * Initialize session with legacy token-encrypted flow
     */
    private async initSessionWithToken(): Promise<KSeFSession | null> {
        try {
            console.log(`[KSeF Token] Initializing session...`);
            const nip = this.extractNipFromToken();
            console.log(`[KSeF Token] NIP: ${nip}`);

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
            console.log('[KSeF Token] Certificate obtained');

            // Step 2: Get challenge
            const challengeResponse = await fetchWithTimeout(`${this.baseUrl}/auth/challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    contextIdentifier: {
                        type: 'Nip',
                        value: nip,
                    },
                }),
            }, 15000);

            if (!challengeResponse.ok) {
                const errorText = await challengeResponse.text();
                console.error('[KSeF Token] Challenge failed:', challengeResponse.status, errorText.substring(0, 200));
                throw new Error(`Challenge failed: ${challengeResponse.status}`);
            }

            const challengeData = await challengeResponse.json();
            console.log('[KSeF Token] Challenge received:', challengeData.challenge?.substring(0, 30) + '...');
            const timestampMs = challengeData.timestampMs || Date.now();

            // Step 3: Encrypt token|timestampMs
            const encryptedToken = encryptTokenForKSeF(this.token, timestampMs, certificatePem);
            console.log('[KSeF Token] Token encrypted successfully');

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
                console.error('[KSeF Token] Auth failed:', authResponse.status, errorText.substring(0, 300));
                throw new Error(`Auth failed: ${authResponse.status} - ${errorText.substring(0, 100)}`);
            }

            const authData = await authResponse.json();
            console.log('[KSeF Token] Auth response:', JSON.stringify(authData).substring(0, 200));

            const authToken = authData.authenticationToken?.token || authData.authenticationToken;
            const referenceNumber = authData.referenceNumber;

            if (!authToken) {
                throw new Error('No authenticationToken in response');
            }

            // Step 5: Poll for completion then redeem
            if (referenceNumber) {
                console.log('[KSeF Token] Polling auth status...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                for (let i = 0; i < 15; i++) {
                    const statusResp = await fetchWithTimeout(`${this.baseUrl}/auth/${referenceNumber}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                        },
                    }, 10000);

                    if (statusResp.ok) {
                        const statusData = await statusResp.json();
                        if (statusData.processingCode === 200 || statusData.status === 'SUCCESS') {
                            console.log('[KSeF Token] Auth completed');
                            break;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Step 6: Redeem token
            console.log('[KSeF Token] Redeeming authToken for accessToken...');
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
                console.error('[KSeF Token] Token redeem failed:', redeemResponse.status, errorText.substring(0, 400));
                // Fallback to authToken
                console.log('[KSeF Token] Falling back to authToken');
                this.accessToken = authToken;
            } else {
                const redeemData = await redeemResponse.json();
                let accessTokenValue = redeemData.accessToken;
                if (typeof accessTokenValue === 'object' && accessTokenValue !== null) {
                    accessTokenValue = accessTokenValue.token || accessTokenValue.value;
                }
                this.accessToken = accessTokenValue || redeemData.token || authToken;
            }

            console.log('[KSeF Token] Session initialized successfully');
            this.session = {
                sessionToken: this.accessToken || '',
                referenceNumber: referenceNumber || 'SESSION-' + Date.now(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            };

            return this.session;

        } catch (error) {
            console.error('[KSeF Token] Session init failed:', error);
            throw error; // Propagate real error message to caller
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
                const session = await this.initSession();
                if (!session || !this.accessToken) {
                    throw new Error('KSeF authentication failed - could not obtain access token. Check certificate, key and password.');
                }
            }

            if (!this.accessToken) {
                throw new Error('KSeF authentication failed - no access token available');
            }

            const dateFromStr = params.dateFrom.toISOString();
            const dateToStr = params.dateTo.toISOString();
            const pageSize = params.pageSize || 500;
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
                        sortOrder: 'DESC',
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
            throw error; // Propagate real error message up
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

            // KSeF v2 endpoints to try for invoice XML download
            // NOTE: Subject2 (purchase) invoices can only be downloaded via async /invoices/exports
            // Direct download only works for Subject1 (issued) invoices
            const endpoints = [
                `${this.baseUrl}/invoices/${ksefReferenceNumber}`,
                `${this.baseUrl}/invoices/download/${ksefReferenceNumber}`,
                `${this.baseUrl}/common/invoice/${ksefReferenceNumber}`,
            ];

            for (const url of endpoints) {
                const response = await fetchWithTimeout(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/xml',
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }, 30000);

                if (response.ok) {
                    const xml = await response.text();
                    console.log(`[KSeF] XML downloaded from ${url}, length: ${xml.length}`);
                    return xml;
                }

                console.warn(`[KSeF] ${url} returned ${response.status}, trying next...`);
            }

            console.error('[KSeF] All invoice XML endpoints returned errors');
            return null;

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
    configOrToken: any,
    environment?: KSeFEnvironment
): KSeFClient {
    return new KSeFClient(configOrToken, environment);
}
