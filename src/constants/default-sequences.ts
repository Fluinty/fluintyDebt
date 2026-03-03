/**
 * Default collection sequences for FluintyDebt
 * These templates are created for each new user during registration
 */

import { SequenceStepInsert } from '@/types/database';

export interface SequenceTemplate {
    name: string;
    description: string;
    isDefault: boolean;
    steps: Omit<SequenceStepInsert, 'sequence_id' | 'id'>[];
}

/**
 * Łagodna (Gentle) sequence - 3 steps
 * For VIP clients and good payers
 */
export const GENTLE_SEQUENCE: SequenceTemplate = {
    name: 'Łagodna',
    description: 'Delikatna sekwencja dla klientów VIP i dobrych płatników',
    isDefault: false,
    steps: [
        {
            step_order: 1,
            days_offset: 3,
            channel: 'email',
            email_subject: 'Informacja o zaległej płatności za fakturę {{invoice_number}}',
            email_body: `Dzień dobry,
            
Informujemy, że w naszym systemie wciąż figuruje brak wpłaty za fakturę nr {{invoice_number}} na kwotę {{amount}}. Będziemy wdzięczni za weryfikację Państwa przelewów i uregulowanie płatności w wolnej chwili. Jeśli przelew został już zlecony, prosimy o zignorowanie tej wiadomości.

Z pozdrowieniami,
{{company_name}}`,
            email_subject_en: 'Information regarding overdue payment for invoice {{invoice_number}}',
            email_body_en: `Good morning,

We would like to inform you that according to our records, payment for invoice {{invoice_number}} in the amount of {{amount}} is still pending. We would appreciate it if you could verify your transfers and settle the payment at your earliest convenience. If the transfer has already been made, please disregard this message.

Best regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 2,
            days_offset: 14,
            channel: 'email',
            email_subject: 'Prośba o uregulowanie wpłaty - faktura {{invoice_number}}',
            email_body: `Szanowni Państwo,

Uprzejmie przypominamy o zaległej płatności za fakturę nr {{invoice_number}} na kwotę {{amount}}.

Prosimy o uregulowanie należności w dbałości o nasze dobre relacje biznesowe.

Z wyrazami szacunku,
{{company_name}}`,
            email_subject_en: 'Payment request - invoice {{invoice_number}}',
            email_body_en: `Dear Customer,

We kindly remind you about the overdue payment for invoice {{invoice_number}} in the amount of {{amount}}.

Please settle the outstanding balance as we value our good business relationship.

Kind regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 3,
            days_offset: 30,
            channel: 'email',
            email_subject: 'Ostateczna prośba o kontakt faktura {{invoice_number}}',
            email_body: `Szanowni Państwo,

Mimo wcześniejszych próśb kontaktu nadal nie odnotowaliśmy wpłaty kwoty {{amount}} za dokument nr {{invoice_number}}. Bardzo prosimy o kontakt w celu wyjaśnienia sytuacji lub o opłacenie zadłużenia, abyśmy mogli zamknąć sprawę polubownie.

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Final request for contact and payment - invoice {{invoice_number}}',
            email_body_en: `Dear Customer,

Despite previous attempts to contact you, we still have not received the payment of {{amount}} for invoice {{invoice_number}}. We kindly ask you to contact us to clarify the situation or to pay the outstanding balance so that we can resolve this matter amicably.

Best regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
    ],
};

/**
 * Standardowa (Standard) sequence - 5 steps
 * Default sequence for most clients
 */
export const STANDARD_SEQUENCE: SequenceTemplate = {
    name: 'Standardowa',
    description: 'Domyślna sekwencja dla większości kontrahentów',
    isDefault: true,
    steps: [
        {
            step_order: 1,
            days_offset: 1,
            channel: 'email',
            email_subject: 'Informacja o braku płatności, faktura {{invoice_number}}',
            email_body: `Dzień dobry,

Wczoraj minął termin płatności na kwotę {{amount}} z tytułu faktury {{invoice_number}}. Jeśli to tylko przeoczenie, bardzo prosimy o uregulowanie należności w najbliższym czasie. Dziękujemy za współpracę!

{{company_name}}`,
            email_subject_en: 'Notification of missing payment, invoice {{invoice_number}}',
            email_body_en: `Good morning,

The payment deadline for the amount of {{amount}} regarding invoice {{invoice_number}} passed yesterday. If this is just an oversight, please settle the outstanding balance in the near future. Thank you for your cooperation!

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 2,
            days_offset: 7,
            channel: 'email',
            email_subject: 'Ponowna prośba o wpłatę - dokument {{invoice_number}}',
            email_body: `Szanowni Państwo,

Niestety wciąż nie odnotowaliśmy przelewu na kwotę {{amount}} za fakturę {{invoice_number}}. Jeśli natrafili Państwo na jakieś problemy z płatnością, prosimy o kontakt. W przeciwnym razie serdecznie prosimy o jej uregulowanie.

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Second payment reminder - invoice {{invoice_number}}',
            email_body_en: `Dear Customer,

Unfortunately, we have still not received the transfer for the amount of {{amount}} regarding invoice {{invoice_number}}. If you have encountered any issues with the payment, please contact us. Otherwise, we kindly ask you to settle it.

Best regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 3,
            days_offset: 14,
            channel: 'email',
            email_subject: 'Wezwanie do zapłaty zaległości z faktury {{invoice_number}}',
            email_body: `Szanowni Państwo,

Z przykrością informujemy, że płatność na sumę {{amount}} z faktury nr {{invoice_number}} wciąż nie wpłynęła. Zależy nam na dobrej współpracy, dlatego prosimy o priorytetowe zrealizowanie przelewu na powyższą kwotę.

Z wyrazami szacunku,
{{company_name}}`,
            email_subject_en: 'Demand for payment of overdue invoice {{invoice_number}}',
            email_body_en: `Dear Customer,

We regret to inform you that the payment for the amount of {{amount}} regarding invoice {{invoice_number}} has still not been received. We value our good cooperation, therefore we ask you to prioritize this transfer for the above amount.

Kind regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 4,
            days_offset: 14,
            channel: 'sms',
            email_subject: 'SMS: Przypomnienie 14 dni', // Internal
            email_body: 'Placeholder', // Internal
            sms_body: `Dzien dobry. Wciaz nie odnotowalismy wplaty {{amount}} za fv {{invoice_number}}. Bardzo prosimy o uregulowanie naleznosci. {{company_name}}`,
            sms_body_en: `Good morning. We still haven't received {{amount}} for inv {{invoice_number}}. Please settle the balance. {{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: false,
        },
        {
            step_order: 5,
            days_offset: 30,
            channel: 'email',
            email_subject: 'Przedsądowe wezwanie do zapłaty (faktura {{invoice_number}})',
            email_body: `Szanowni Państwo,

Bardzo chcielibyśmy polubownie zamknąć kwestię zaległości na kwotę {{amount}} (dotyczy faktury nr {{invoice_number}}). To już nasze ostateczne wezwanie — prosimy o uregulowanie salda, by uniknąć ewentualnego zaangażowania zewnętrznej windykacji.

{{company_name}}`,
            email_subject_en: 'Pre-legal demand for payment (invoice {{invoice_number}})',
            email_body_en: `Dear Customer,

We would very much like to amicably resolve the issue of the outstanding balance for the amount of {{amount}} (regarding invoice {{invoice_number}}). This is our final demand — please settle the balance to avoid the possible involvement of an external debt collection agency.

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
    ],
};

/**
 * Szybka Eskalacja (Quick Escalation) sequence - 7 steps
 * For difficult clients or large amounts
 */
export const QUICK_ESCALATION_SEQUENCE: SequenceTemplate = {
    name: 'Szybka Eskalacja',
    description: 'Intensywna sekwencja dla trudnych kontrahentów lub dużych kwot',
    isDefault: false,
    steps: [
        {
            step_order: 1,
            days_offset: 1,
            channel: 'email',
            email_subject: 'Informacja o braku płatności, faktura {{invoice_number}}',
            email_body: `Dzień dobry,

Wczoraj minął termin płatności na kwotę {{amount}} z tytułu faktury {{invoice_number}}. Jeśli to tylko przeoczenie, bardzo prosimy o uregulowanie należności w najbliższym czasie. Dziękujemy za współpracę!

{{company_name}}`,
            email_subject_en: 'Notification of missing payment, invoice {{invoice_number}}',
            email_body_en: `Good morning,

The payment deadline for the amount of {{amount}} regarding invoice {{invoice_number}} passed yesterday. If this is just an oversight, please settle the outstanding balance in the near future. Thank you for your cooperation!

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 2,
            days_offset: 3,
            channel: 'email',
            email_subject: 'Drugie przypomnienie o wpłacie {{invoice_number}}',
            email_body: `Szanowni Państwo, 
            
To drugie przypomnienie o braku wpłaty {{amount}} za dokument {{invoice_number}}. Będziemy bardzo wdzięczni za pilne wykonanie przelewu. 

{{company_name}}`,
            email_subject_en: 'Second reminder for payment {{invoice_number}}',
            email_body_en: `Dear Customer, 

This is our second reminder regarding the missing payment of {{amount}} for invoice {{invoice_number}}. We would be very grateful if you could make the transfer urgently. 

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 3,
            days_offset: 7,
            channel: 'email',
            email_subject: 'Zawiadomienie o zadłużeniu {{invoice_number}}',
            email_body: `Szanowni Państwo, 
            
Wciąż brakuje nam uregulowania kwoty {{amount}} za fakturę {{invoice_number}}. Prosimy o możliwie natychmiastową reakcję i dokonanie przelewu. 

Z poważaniem, 
{{company_name}}`,
            email_subject_en: 'Debt notification {{invoice_number}}',
            email_body_en: `Dear Customer, 

We are still awaiting the payment of {{amount}} for invoice {{invoice_number}}. We kindly ask for your immediate response and to make the transfer. 

Best regards, 
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 4,
            days_offset: 14,
            channel: 'email',
            email_subject: 'Ostatnie przedsądowe wezwanie {{invoice_number}}',
            email_body: `Szanowni Państwo, 
            
Przypominamy o zaległych {{amount}} (FV {{invoice_number}}). Zwracamy się z ogromną prośbą o zamknięcie tej sprawy w sposób polubowny i wysłanie środków. 

{{company_name}}`,
            email_subject_en: 'Final pre-legal notice {{invoice_number}}',
            email_body_en: `Dear Customer, 

This is a reminder about the overdue {{amount}} (Invoice {{invoice_number}}). We strongly request that you close this matter amicably by sending the funds. 

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 5,
            days_offset: 14,
            channel: 'sms',
            email_subject: 'SMS: Przedsądowe 14 dni', // Internal
            email_body: 'Placeholder', // Internal
            sms_body: `PILNE: Przypominamy o braku wplaty {{amount}} (fv {{invoice_number}}). Zalezy nam na polubownym zamknieciu sprawy. Prosimy o przelew. {{company_name}}`,
            sms_body_en: `URGENT: Reminder of missing {{amount}} (inv {{invoice_number}}). We want to resolve this amicably. Please transfer funds. {{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: false,
        },
        {
            step_order: 6,
            days_offset: 21,
            channel: 'email',
            email_subject: 'Ostateczne wezwanie - faktura {{invoice_number}}',
            email_body: `Szanowni Państwo, 
            
Zwracamy się z wezwaniem o natychmiastowe uregulowanie opóźnionego zadłużenia za fakturę {{invoice_number}} na łączną kwotę {{amount}}. W przypadku braku wpłaty będziemy zmuszeni skierować sprawę na drogę prawną. 

{{company_name}}`,
            email_subject_en: 'Final demand - invoice {{invoice_number}}',
            email_body_en: `Dear Customer, 

We are issuing a demand for immediate payment of the overdue debt for invoice {{invoice_number}} in the total amount of {{amount}}. In the absence of payment, we will be forced to take legal action. 

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
        {
            step_order: 7,
            days_offset: 30,
            channel: 'email',
            email_subject: 'Informacja o przekazaniu sprawy {{invoice_number}}',
            email_body: `Szanowni Państwo, 
            
Z uwagi na brak odpowiedzi i uregulowania faktury {{invoice_number}} na {{amount}}, informujemy o konieczności przekazania sprawy do zewnętrznej windykacji. Prosimy o pilną wpłatę. 

{{company_name}}`,
            email_subject_en: 'Information regarding the referral of matter {{invoice_number}}',
            email_body_en: `Dear Customer, 

Due to the lack of response and failure to settle invoice {{invoice_number}} for {{amount}}, we regret to inform you that we must refer this matter to external debt collection. Please pay urgently. 

{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
            attach_invoice: true,
        },
    ],
};

export const THANK_YOU_EMAIL = {
    subject: 'Potwierdzenie wpływu płatności - faktura {{invoice_number}}',
    body: `Dzień dobry,

Uprzejmie potwierdzamy odnotowanie płatności za fakturę nr {{invoice_number}}.

Bardzo dziękujemy za współpracę i uregulowanie należności.

Z poważaniem,
{{company_name}}`,
};

/**
 * All default sequences
 */
export const DEFAULT_SEQUENCES = [
    GENTLE_SEQUENCE,
    STANDARD_SEQUENCE,
    QUICK_ESCALATION_SEQUENCE,
];
