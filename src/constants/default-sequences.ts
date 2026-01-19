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
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 4,
            days_offset: 7,
            channel: 'both',
            email_subject: 'Wezwanie do zapłaty - faktura przeterminowana',
            email_body: `Szanowni Państwo,

Faktura nr {{invoice_number}} jest przeterminowana o {{days_overdue}} dni.

Kwota do zapłaty: {{amount}}

Prosimy o niezwłoczne uregulowanie należności. W przypadku problemów z płatnością, prosimy o kontakt w celu ustalenia warunków spłaty.

{{payment_link}}

Z poważaniem,
{{company_name}}`,
            sms_body: 'Faktura {{invoice_number}} przeterminowana o {{days_overdue}} dni. Kwota: {{amount}}. Prosimy o pilną wpłatę. {{company_name}}',
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
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 2,
            days_offset: -1,
            channel: 'both',
            email_subject: 'PILNE: Jutro termin płatności - {{invoice_number}}',
            email_body: `Dzień dobry,

PILNE: Jutro mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.

{{payment_link}}

{{company_name}}`,
            sms_body: 'PILNE: Jutro {{due_date}} mija termin płatności FV {{invoice_number}} - {{amount}}. {{company_name}}',
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
            include_payment_link: true,
            include_interest: false,
        },
        {
            step_order: 4,
            days_offset: 3,
            channel: 'both',
            email_subject: 'DRUGIE WEZWANIE - faktura {{invoice_number}}',
            email_body: `Szanowni Państwo,

To drugie wezwanie dotyczące faktury nr {{invoice_number}}, która jest już przeterminowana o {{days_overdue}} dni.

Kwota: {{amount}}

Prosimy o pilny kontakt lub wpłatę.

{{payment_link}}

{{company_name}}`,
            sms_body: 'DRUGIE WEZWANIE: FV {{invoice_number}} przeterminowana {{days_overdue}} dni. {{amount}}. Prosimy o kontakt. {{company_name}}',
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
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 6,
            days_offset: 14,
            channel: 'both',
            email_subject: 'PRZEDOSTATNIE WEZWANIE - {{invoice_number}}',
            email_body: `Szanowni Państwo,

To przedostatnie wezwanie przed przekazaniem sprawy do postępowania windykacyjnego.

Faktura: {{invoice_number}}
Należność z odsetkami: {{amount_with_interest}}

{{payment_link}}

{{company_name}}`,
            sms_body: 'PRZEDOSTATNIE WEZWANIE: FV {{invoice_number}} - {{amount_with_interest}}. Następny krok: windykacja. {{company_name}}',
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
            include_payment_link: true,
            include_interest: true,
        },
        {
            step_order: 8,
            days_offset: 30,
            channel: 'both',
            email_subject: 'OSTATNIE OSTRZEŻENIE - przekazanie do windykacji',
            email_body: `Szanowni Państwo,

Informujemy, że sprawa dotycząca faktury nr {{invoice_number}} na kwotę {{amount_with_interest}} zostanie w najbliższych dniach przekazana do zewnętrznej firmy windykacyjnej.

Wiąże się to z dodatkowymi kosztami, które obciążą Państwa.

Jest to ostatnia szansa na polubowne rozwiązanie sprawy.

{{payment_link}}

{{company_name}}`,
            sms_body: 'OSTATNIE OSTRZEŻENIE: FV {{invoice_number}} przekazujemy do windykacji. Prosimy o pilny kontakt. {{company_name}}',
            include_payment_link: true,
            include_interest: true,
        },
    ],
};

/**
 * Thank you email template
 */
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
];
