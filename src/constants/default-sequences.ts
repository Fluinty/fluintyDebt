/**
 * Default collection sequences for VindycAItion
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
 * Łagodna (Gentle) sequence - 4 steps
 * For VIP clients and good payers
 */
export const GENTLE_SEQUENCE: SequenceTemplate = {
    name: 'Łagodna',
    description: 'Delikatna sekwencja dla klientów VIP i dobrych płatników',
    isDefault: false,
    steps: [
        {
            step_order: 1,
            days_offset: -3,
            channel: 'email',
            email_subject: 'Przypomnienie - zbliżający się termin płatności',
            email_body: `Dzień dobry,

Uprzejmie przypominamy, że za 3 dni mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.

Jeśli płatność została już zrealizowana, prosimy zignorować tę wiadomość.

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Reminder - Payment due soon',
            email_body_en: `Dear Customer,

This is a friendly reminder that payment for invoice {{invoice_number}} in the amount of {{amount}} is due in 3 days.

If you have already made the payment, please disregard this message.

Best regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
        },
        {
            step_order: 2,
            days_offset: 3,
            channel: 'email',
            email_subject: 'Informacja o przekroczeniu terminu płatności',
            email_body: `Dzień dobry,

Informujemy, że faktura nr {{invoice_number}} na kwotę {{amount}} przekroczyła termin płatności o {{days_overdue}} dni.

Prosimy o uregulowanie należności w najbliższym możliwym terminie.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment overdue notification',
            email_body_en: `Dear Customer,

Please be advised that invoice {{invoice_number}} for {{amount}} is now {{days_overdue}} days past due.

We kindly ask you to settle this payment at your earliest convenience.

{{payment_link}}

Best regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 3,
            days_offset: 14,
            channel: 'email',
            email_subject: 'Wezwanie do zapłaty - {{invoice_number}}',
            email_body: `Szanowni Państwo,

Faktura nr {{invoice_number}} pozostaje nieopłacona od {{days_overdue}} dni.

Należność główna: {{amount}}
Naliczone odsetki: {{interest_amount}}
RAZEM: {{amount_with_interest}}

Prosimy o pilne uregulowanie należności.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment Request - {{invoice_number}}',
            email_body_en: `Dear Customer,

Invoice {{invoice_number}} remains unpaid for {{days_overdue}} days.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL: {{amount_with_interest}}

Please settle this amount urgently.

{{payment_link}}

Best regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 4,
            days_offset: 30,
            channel: 'email',
            email_subject: 'Ostateczne wezwanie do zapłaty - {{invoice_number}}',
            email_body: `Szanowni Państwo,

Pomimo wcześniejszych monitów, faktura nr {{invoice_number}} pozostaje nieopłacona.

Należność główna: {{amount}}
Naliczone odsetki: {{interest_amount}}
RAZEM DO ZAPŁATY: {{amount_with_interest}}

Jest to ostateczne wezwanie przed przekazaniem sprawy do dalszego postępowania.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'Final Payment Notice - {{invoice_number}}',
            email_body_en: `Dear Customer,

Despite previous reminders, invoice {{invoice_number}} remains unpaid.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

This is a final notice before further collection action is taken.

{{payment_link}}

{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
    ],
};

/**
 * Standardowa (Standard) sequence - 6 steps
 * Default sequence for most clients
 */
export const STANDARD_SEQUENCE: SequenceTemplate = {
    name: 'Standardowa',
    description: 'Domyślna sekwencja dla większości kontrahentów',
    isDefault: true,
    steps: [
        {
            step_order: 1,
            days_offset: -7,
            channel: 'email',
            email_subject: 'Przypomnienie o zbliżającym się terminie płatności',
            email_body: `Dzień dobry,

Uprzejmie przypominamy, że za tydzień, tj. {{due_date}}, mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.

Jeśli płatność została już zrealizowana, prosimy zignorować tę wiadomość.

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment reminder - Due in one week',
            email_body_en: `Dear Customer,

This is a friendly reminder that payment for invoice {{invoice_number}} in the amount of {{amount}} is due on {{due_date}}.

If you have already made the payment, please disregard this message.

Best regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
        },
        {
            step_order: 2,
            days_offset: -1,
            channel: 'email',
            email_subject: 'Jutro mija termin płatności - {{invoice_number}}',
            email_body: `Dzień dobry,

Przypominamy, że jutro ({{due_date}}) mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.

Aby uniknąć naliczania odsetek, prosimy o terminową wpłatę.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment due tomorrow - {{invoice_number}}',
            email_body_en: `Dear Customer,

This is a reminder that invoice {{invoice_number}} for {{amount}} is due tomorrow ({{due_date}}).

To avoid interest charges, please make your payment on time.

{{payment_link}}

Best regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 3,
            days_offset: 1,
            channel: 'email',
            email_subject: 'Termin płatności minął - {{invoice_number}}',
            email_body: `Dzień dobry,

Informujemy, że wczoraj minął termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.

Prosimy o pilne uregulowanie należności.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment overdue - {{invoice_number}}',
            email_body_en: `Dear Customer,

Please be advised that invoice {{invoice_number}} for {{amount}} was due yesterday.

We kindly ask you to settle this payment promptly.

{{payment_link}}

Best regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 4,
            days_offset: 7,
            channel: 'email',
            email_subject: 'Wezwanie do zapłaty - faktura przeterminowana',
            email_body: `Szanowni Państwo,

Faktura nr {{invoice_number}} jest przeterminowana o {{days_overdue}} dni.

Kwota do zapłaty: {{amount}}

Prosimy o niezwłoczne uregulowanie należności. W przypadku problemów z płatnością, prosimy o kontakt w celu ustalenia warunków spłaty.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment Request - Invoice Overdue',
            email_body_en: `Dear Customer,

Invoice {{invoice_number}} is now {{days_overdue}} days overdue.

Amount due: {{amount}}

Please settle this payment immediately. If you are experiencing payment difficulties, please contact us to arrange a payment plan.

{{payment_link}}

Best regards,
{{company_name}}`,

            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 5,
            days_offset: 14,
            channel: 'email',
            email_subject: 'WEZWANIE DO ZAPŁATY z odsetkami - {{invoice_number}}',
            email_body: `Szanowni Państwo,

Pomimo wcześniejszych wezwań, faktura nr {{invoice_number}} pozostaje nieopłacona.

Należność główna: {{amount}}
Naliczone odsetki: {{interest_amount}}
RAZEM DO ZAPŁATY: {{amount_with_interest}}

Prosimy o uregulowanie pełnej kwoty w ciągu 7 dni.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'PAYMENT DEMAND with interest - {{invoice_number}}',
            email_body_en: `Dear Customer,

Despite previous requests, invoice {{invoice_number}} remains unpaid.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Please settle the full amount within 7 days.

{{payment_link}}

Best regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 6,
            days_offset: 30,
            channel: 'email',
            email_subject: 'OSTATECZNE WEZWANIE DO ZAPŁATY - {{invoice_number}}',
            email_body: `Szanowni Państwo,

Niniejszym wzywamy do NATYCHMIASTOWEJ zapłaty należności wynikającej z faktury nr {{invoice_number}}.

Należność główna: {{amount}}
Naliczone odsetki: {{interest_amount}}
RAZEM DO ZAPŁATY: {{amount_with_interest}}

W przypadku braku wpłaty w terminie 7 dni od otrzymania niniejszego wezwania, sprawa zostanie przekazana do dalszego postępowania windykacyjnego, co wiązać się będzie z dodatkowymi kosztami.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'FINAL PAYMENT DEMAND - {{invoice_number}}',
            email_body_en: `Dear Customer,

We hereby demand IMMEDIATE payment of the outstanding amount for invoice {{invoice_number}}.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Failure to pay within 7 days of receiving this notice will result in the matter being referred for further collection action, which will incur additional costs.

{{payment_link}}

{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
    ],
};

/**
 * Szybka Eskalacja (Quick Escalation) sequence - 8 steps
 * For difficult clients or large amounts
 */
export const QUICK_ESCALATION_SEQUENCE: SequenceTemplate = {
    name: 'Szybka Eskalacja',
    description: 'Intensywna sekwencja dla trudnych kontrahentów lub dużych kwot',
    isDefault: false,
    steps: [
        {
            step_order: 1,
            days_offset: -7,
            channel: 'email',
            email_subject: 'Przypomnienie o zbliżającym się terminie płatności',
            email_body: `Dzień dobry,

Przypominamy o zbliżającym się terminie płatności faktury nr {{invoice_number}} na kwotę {{amount}}. Termin płatności: {{due_date}}.

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment reminder - Due date approaching',
            email_body_en: `Dear Customer,

This is a reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.

Best regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 2,
            days_offset: -1,
            channel: 'email',
            email_subject: 'PILNE: Jutro termin płatności - {{invoice_number}}',
            email_body: `Dzień dobry,

PILNE: Jutro mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'URGENT: Payment due tomorrow - {{invoice_number}}',
            email_body_en: `Dear Customer,

URGENT: Invoice {{invoice_number}} for {{amount}} is due tomorrow.

{{payment_link}}

{{company_name}}`,
            sms_body: 'PILNE: Jutro {{due_date}} mija termin płatności FV {{invoice_number}} - {{amount}}. {{company_name}}',
            sms_body_en: 'URGENT: Invoice {{invoice_number}} for {{amount}} is due tomorrow {{due_date}}. {{company_name}}',
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 3,
            days_offset: 1,
            channel: 'email',
            email_subject: 'Termin płatności przekroczony - {{invoice_number}}',
            email_body: `Szanowni Państwo,

Termin płatności faktury nr {{invoice_number}} został przekroczony. Prosimy o natychmiastową wpłatę kwoty {{amount}}.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'Payment overdue - {{invoice_number}}',
            email_body_en: `Dear Customer,

Invoice {{invoice_number}} is now overdue. Please make an immediate payment of {{amount}}.

{{payment_link}}

{{company_name}}`,
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 4,
            days_offset: 3,
            channel: 'email',
            email_subject: 'DRUGIE WEZWANIE - faktura {{invoice_number}}',
            email_body: `Szanowni Państwo,

To drugie wezwanie dotyczące faktury nr {{invoice_number}}, która jest już przeterminowana o {{days_overdue}} dni.

Kwota: {{amount}}

Prosimy o pilny kontakt lub wpłatę.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'SECOND NOTICE - Invoice {{invoice_number}}',
            email_body_en: `Dear Customer,

This is our second notice regarding invoice {{invoice_number}}, which is now {{days_overdue}} days overdue.

Amount: {{amount}}

Please contact us or make payment immediately.

{{payment_link}}

{{company_name}}`,

            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 5,
            days_offset: 7,
            channel: 'email',
            email_subject: 'TRZECIE WEZWANIE z odsetkami - {{invoice_number}}',
            email_body: `Szanowni Państwo,

To trzecie wezwanie do zapłaty faktury nr {{invoice_number}}.

Należność główna: {{amount}}
Odsetki: {{interest_amount}}
RAZEM: {{amount_with_interest}}

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'THIRD NOTICE with interest - {{invoice_number}}',
            email_body_en: `Dear Customer,

This is our third notice regarding invoice {{invoice_number}}.

Principal amount: {{amount}}
Interest: {{interest_amount}}
TOTAL: {{amount_with_interest}}

{{payment_link}}

{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 6,
            days_offset: 14,
            channel: 'email',
            email_subject: 'PRZEDOSTATNIE WEZWANIE - {{invoice_number}}',
            email_body: `Szanowni Państwo,

To przedostatnie wezwanie przed przekazaniem sprawy do postępowania windykacyjnego.

Faktura: {{invoice_number}}
Należność z odsetkami: {{amount_with_interest}}

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'PENULTIMATE NOTICE - {{invoice_number}}',
            email_body_en: `Dear Customer,

This is our penultimate notice before the matter is referred for collection.

Invoice: {{invoice_number}}
Amount with interest: {{amount_with_interest}}

{{payment_link}}

{{company_name}}`,

            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 7,
            days_offset: 21,
            channel: 'email',
            email_subject: 'OSTATECZNE WEZWANIE - {{invoice_number}}',
            email_body: `Szanowni Państwo,

OSTATECZNE WEZWANIE DO ZAPŁATY

Faktura nr {{invoice_number}}
Należność główna: {{amount}}
Odsetki: {{interest_amount}}
RAZEM DO ZAPŁATY: {{amount_with_interest}}

Brak wpłaty w ciągu 3 dni roboczych skutkować będzie wszczęciem postępowania windykacyjnego.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'FINAL DEMAND - {{invoice_number}}',
            email_body_en: `Dear Customer,

FINAL PAYMENT DEMAND

Invoice: {{invoice_number}}
Principal amount: {{amount}}
Interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Failure to pay within 3 business days will result in collection proceedings.

{{payment_link}}

{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 8,
            days_offset: 30,
            channel: 'email',
            email_subject: 'OSTATNIE OSTRZEŻENIE - przekazanie do windykacji',
            email_body: `Szanowni Państwo,

Informujemy, że sprawa dotycząca faktury nr {{invoice_number}} na kwotę {{amount_with_interest}} zostanie w najbliższych dniach przekazana do zewnętrznej firmy windykacyjnej.

Wiąże się to z dodatkowymi kosztami, które obciążą Państwa.

Jest to ostatnia szansa na polubowne rozwiązanie sprawy.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'FINAL WARNING - Referral to collection agency',
            email_body_en: `Dear Customer,

Please be advised that the matter regarding invoice {{invoice_number}} for {{amount_with_interest}} will be referred to an external collection agency within the coming days.

This will result in additional costs that will be charged to you.

This is your last opportunity to resolve this matter amicably.

{{payment_link}}

{{company_name}}`,

            include_payment_link: true,
            include_interest: true,
        },
    ],
};

/**
 * Wielokanałowa (Omnichannel) sequence - 7 steps
 * Uses Email, SMS, and Voice
 */
export const OMNICHANNEL_SEQUENCE: SequenceTemplate = {
    name: 'Wielokanałowa (SMS & Voice)',
    description: 'Skuteczna windykacja wykorzystująca email, SMS i połączenia głosowe',
    isDefault: false,
    steps: [
        {
            step_order: 1,
            days_offset: -3,
            channel: 'email',
            email_subject: 'Przypomnienie o płatności',
            email_body: `Dzień dobry,
            
Przypominamy, że za 3 dni mija termin płatności faktury {{invoice_number}}.

Kwota: {{amount}}

Pozdrawiamy,
{{company_name}}`,
            email_subject_en: 'Payment Reminder',
            email_body_en: `Hello,

Reminder: Invoice {{invoice_number}} is due in 3 days.

Amount: {{amount}}

Regards,
{{company_name}}`,
            include_payment_link: false,
            include_interest: false,
        },
        {
            step_order: 2,
            days_offset: 0,
            channel: 'sms',
            email_subject: 'SMS: Dziś termin płatności', // Internal label
            email_body: 'Placeholder', // Required by DB constraint but not used
            sms_body: 'Dziś mija termin płatności faktury {{invoice_number}} na kwotę {{amount}}. Prosimy o wpłatę. {{company_name}}',
            sms_body_en: 'Today is the due date for invoice {{invoice_number}}, amount: {{amount}}. Please pay now. {{company_name}}',
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 3,
            days_offset: 3,
            channel: 'voice',
            email_subject: 'Voice: Przypomnienie po terminie',
            email_body: 'Placeholder',
            voice_script: 'Dzień dobry. Tu {{company_name}}. Przypominamy o nieopłaconej fakturze numer {{invoice_number}} na kwotę {{amount}}. Termin minął 3 dni temu. Prosimy o wpłatę.',
            voice_script_en: 'Hello. This is {{company_name}}. We are calling about unpaid invoice {{invoice_number}} for {{amount}}. It is 3 days overdue. Please make a payment.',
            include_payment_link: false,
            include_interest: false,
        },
        {
            step_order: 4,
            days_offset: 7,
            channel: 'email',
            email_subject: 'Wezwanie do zapłaty',
            email_body: `Szanowni Państwo,

Faktura {{invoice_number}} jest przeterminowana o 7 dni. Prosimy o wpłatę {{amount}}.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            email_subject_en: 'Payment Demand',
            email_body_en: `Dear Customer,

Invoice {{invoice_number}} is 7 days overdue. Please pay {{amount}}.

{{payment_link}}

Regards,
{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 5,
            days_offset: 14,
            channel: 'sms',
            email_subject: 'SMS: Pilne wezwanie',
            email_body: 'Placeholder',
            sms_body: 'PILNE: Faktura {{invoice_number}} ({{amount}}) nadal nieopłacona. Prosimy o natychmiastową wpłatę. {{company_name}}',
            sms_body_en: 'URGENT: Invoice {{invoice_number}} ({{amount}}) is still unpaid. Please pay immediately. {{company_name}}',
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 6,
            days_offset: 21,
            channel: 'voice',
            email_subject: 'Voice: Ostateczne wezwanie',
            email_body: 'Placeholder',
            voice_script: 'Dzień dobry. Prosimy o natychmiastowe uregulowanie faktury {{invoice_number}} na kwotę {{amount}}. W przypadku braku wpłaty sprawa trafi do windykacji.',
            voice_script_en: 'Good morning. Please settle invoice {{invoice_number}} for {{amount}} immediately. Failure to pay will result in debt collection actions.',
            include_payment_link: false,
            include_interest: true,
        },
        {
            step_order: 7,
            days_offset: 30,
            channel: 'email',
            email_subject: 'OSTATECZNE WEZWANIE PRZED SĄDOWE',
            email_body: `OSTATECZNE WEZWANIE

Brak wpłaty dla faktury {{invoice_number}}. Kwota: {{amount_with_interest}}.

Sprawa zostanie skierowana do sądu.

{{payment_link}}

{{company_name}}`,
            email_subject_en: 'FINAL PRE-LEGAL DEMAND',
            email_body_en: `FINAL DEMAND

No payment received for invoice {{invoice_number}}. Amount: {{amount_with_interest}}.

Legal action will be taken.

{{payment_link}}

{{company_name}}`,
            include_payment_link: true,
            include_interest: true,
        }
    ],
};

export const THANK_YOU_EMAIL = {
    subject: 'Potwierdzenie otrzymania płatności - {{invoice_number}}',
    body: `Dzień dobry,

Potwierdzamy otrzymanie płatności za fakturę nr {{invoice_number}}.

Dziękujemy za terminowe uregulowanie należności i liczymy na dalszą owocną współpracę.

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
    OMNICHANNEL_SEQUENCE,
];
