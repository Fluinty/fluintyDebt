import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { PaymentReminderData } from './types';

// Register Polish font (optional - can use system fonts)
// Font.register({
//     family: 'Roboto',
//     src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
// });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        lineHeight: 1.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    logo: {
        width: 100,
        height: 50,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 30,
        color: '#666',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        width: '40%',
        color: '#666',
    },
    value: {
        width: '60%',
        fontWeight: 'bold',
    },
    addressBlock: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
    addressTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        fontSize: 10,
        textTransform: 'uppercase',
        color: '#333',
    },
    addressText: {
        fontSize: 10,
        lineHeight: 1.4,
    },
    table: {
        marginTop: 10,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#333',
        color: '#fff',
        padding: 8,
    },
    tableHeaderCell: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 9,
        color: '#fff',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 8,
    },
    tableCell: {
        flex: 1,
        fontSize: 9,
    },
    totalRow: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        padding: 10,
        marginTop: 10,
    },
    totalLabel: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 12,
    },
    totalValue: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    bankSection: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
    },
    bankTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
        fontSize: 11,
    },
    bankRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    bankLabel: {
        width: '35%',
        color: '#666',
        fontSize: 9,
    },
    bankValue: {
        width: '65%',
        fontWeight: 'bold',
        fontSize: 10,
    },
    legalText: {
        marginTop: 25,
        fontSize: 9,
        lineHeight: 1.6,
        textAlign: 'justify',
        color: '#444',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
    },
    signature: {
        marginTop: 50,
        alignItems: 'flex-end',
    },
    signatureLine: {
        width: 150,
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 5,
        textAlign: 'center',
        fontSize: 9,
    },
    date: {
        textAlign: 'right',
        marginBottom: 20,
        fontSize: 10,
    },
});

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
    }).format(amount);
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getReminderTitle(type: PaymentReminderData['reminder_type']): string {
    switch (type) {
        case 'soft':
            return 'PRZYPOMNIENIE O PLATNOSCI';
        case 'standard':
            return 'WEZWANIE DO ZAPLATY';
        case 'firm':
            return 'PRZEDSADOWE WEZWANIE DO ZAPLATY';
        case 'final':
            return 'OSTATECZNE PRZEDSADOWE WEZWANIE DO ZAPLATY';
        default:
            return 'WEZWANIE DO ZAPLATY';
    }
}

function getLegalText(type: PaymentReminderData['reminder_type'], deadlineDays: number): string {
    const deadline = `${deadlineDays} dni`;

    switch (type) {
        case 'soft':
            return `Uprzejmie przypominamy o nieuregulowanej platnosci za powyzej wymieniona fakture. Prosimy o dokonanie zaplaty w terminie ${deadline} od daty otrzymania niniejszego pisma.`;
        case 'standard':
            return `Wzywamy do niezwlocznego uregulowania naleznosci w terminie ${deadline} od daty otrzymania niniejszego wezwania. Brak zaplaty w wyznaczonym terminie spowoduje naliczanie dalszych odsetek ustawowych oraz podjecie krokow prawnych w celu odzyskania naleznosci.`;
        case 'firm':
            return `Niniejszym wzywamy do niezwlocznej zaplaty naleznosci w terminie ${deadline} od daty otrzymania niniejszego wezwania. Informujemy, ze w przypadku braku zaplaty w wyznaczonym terminie, sprawa zostanie skierowana na droge postepowania sadowego bez dodatkowych wezwan. Wiazac sie to bedzie z dodatkowymi kosztami, w tym kosztami sadowymi, kosztami zastepstwa procesowego oraz dalszymi odsetkami.`;
        case 'final':
            return `OSTATECZNE WEZWANIE - Niniejszym po raz ostatni wzywamy do zaplaty ponizej wymienionych naleznosci w terminie ${deadline} od daty otrzymania niniejszego pisma. Informujemy, ze jest to ostateczne wezwanie przed skierowaniem sprawy na droge sadowa. Po bezskutecznym uplywie terminu sprawa zostanie przekazana do kancelarii prawnej badz firmy windykacyjnej, co spowoduje znaczne zwiekszenie kosztow, ktore zostana doliczone do Panstwa zadluzenia.`;
        default:
            return `Prosimy o uregulowanie naleznosci w terminie ${deadline} dni.`;
    }
}

interface PaymentReminderPDFProps {
    data: PaymentReminderData;
}

export function PaymentReminderPDF({ data }: PaymentReminderPDFProps) {
    const { creditor, debtor, invoice, interest, deadline_days, generated_date, reminder_type } = data;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Date */}
                <Text style={styles.date}>
                    {creditor.city}, {formatDate(generated_date)}
                </Text>

                {/* Title */}
                <Text style={styles.title}>{getReminderTitle(reminder_type)}</Text>

                {/* Addresses */}
                <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                    {/* Creditor */}
                    <View style={[styles.addressBlock, { marginRight: 20, flex: 1 }]}>
                        <Text style={styles.addressTitle}>Wierzyciel:</Text>
                        <Text style={styles.addressText}>{creditor.name}</Text>
                        <Text style={styles.addressText}>{creditor.address}</Text>
                        <Text style={styles.addressText}>{creditor.postal_code} {creditor.city}</Text>
                        <Text style={styles.addressText}>NIP: {creditor.nip}</Text>
                    </View>

                    {/* Debtor */}
                    <View style={[styles.addressBlock, { flex: 1 }]}>
                        <Text style={styles.addressTitle}>Dluznik:</Text>
                        <Text style={styles.addressText}>{debtor.name}</Text>
                        {debtor.address && <Text style={styles.addressText}>{debtor.address}</Text>}
                        {debtor.postal_code && debtor.city && (
                            <Text style={styles.addressText}>{debtor.postal_code} {debtor.city}</Text>
                        )}
                        {debtor.nip && <Text style={styles.addressText}>NIP: {debtor.nip}</Text>}
                    </View>
                </View>

                {/* Invoice Details Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dane faktury</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Nr faktury</Text>
                            <Text style={styles.tableHeaderCell}>Data wystawienia</Text>
                            <Text style={styles.tableHeaderCell}>Termin platnosci</Text>
                            <Text style={styles.tableHeaderCell}>Kwota</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 2 }]}>{invoice.invoice_number}</Text>
                            <Text style={styles.tableCell}>{formatDate(invoice.issue_date)}</Text>
                            <Text style={styles.tableCell}>{formatDate(invoice.due_date)}</Text>
                            <Text style={styles.tableCell}>{formatCurrency(invoice.amount_gross)}</Text>
                        </View>
                    </View>
                </View>

                {/* Interest Calculation */}
                {interest.interest_amount > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Naliczone odsetki</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Kwota glowna:</Text>
                            <Text style={styles.value}>{formatCurrency(interest.principal)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Dni opoznienia:</Text>
                            <Text style={styles.value}>{interest.days_overdue} dni</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Stopa odsetek (roczna):</Text>
                            <Text style={styles.value}>{interest.interest_rate}%</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Odsetki:</Text>
                            <Text style={styles.value}>{formatCurrency(interest.interest_amount)}</Text>
                        </View>
                    </View>
                )}

                {/* Total */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>RAZEM DO ZAPLATY:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(interest.total_amount)}</Text>
                </View>

                {/* Bank Details */}
                <View style={styles.bankSection}>
                    <Text style={styles.bankTitle}>Dane do przelewu:</Text>
                    <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Odbiorca:</Text>
                        <Text style={styles.bankValue}>{creditor.name}</Text>
                    </View>
                    <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Nr konta:</Text>
                        <Text style={styles.bankValue}>{creditor.bank_account}</Text>
                    </View>
                    {creditor.bank_name && (
                        <View style={styles.bankRow}>
                            <Text style={styles.bankLabel}>Bank:</Text>
                            <Text style={styles.bankValue}>{creditor.bank_name}</Text>
                        </View>
                    )}
                    <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Tytul przelewu:</Text>
                        <Text style={styles.bankValue}>{invoice.invoice_number}</Text>
                    </View>
                </View>

                {/* Legal Text */}
                <Text style={styles.legalText}>
                    {getLegalText(reminder_type, deadline_days)}
                </Text>

                {/* Signature */}
                <View style={styles.signature}>
                    <Text style={styles.signatureLine}>podpis i pieczec</Text>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Dokument wygenerowany automatycznie - {formatDate(generated_date)}
                </Text>
            </Page>
        </Document>
    );
}
