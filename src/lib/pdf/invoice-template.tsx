import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import type { PaymentReminderData } from './types';
import { InvoiceItem } from '../ksef/xml-parser';

// Register Polish fonts
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ],
});

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Roboto',
        padding: 40,
        fontSize: 10,
        color: '#333333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        borderBottom: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 20,
    },
    headerLeft: {
        flexDirection: 'column',
    },
    headerRight: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    partiesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    partyBox: {
        width: '45%',
    },
    partyLabel: {
        fontSize: 9,
        fontWeight: 700,
        color: '#6B7280',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    partyName: {
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 4,
    },
    partyDetail: {
        fontSize: 10,
        marginBottom: 2,
    },
    table: {
        width: '100%',
        marginBottom: 30,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        padding: 8,
        borderBottom: 1,
        borderBottomColor: '#E5E7EB',
    },
    tableHeaderCell: {
        fontSize: 9,
        fontWeight: 700,
        color: '#374151',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottom: 1,
        borderBottomColor: '#EEEEEE',
    },
    tableCell: {
        fontSize: 9,
    },
    // Column widths
    colNo: { width: '5%' },
    colDesc: { width: '40%' },
    colQty: { width: '10%', textAlign: 'right' },
    colUnit: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colVat: { width: '5%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },

    summary: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 30,
    },
    summaryBox: {
        width: '50%',
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 10,
        fontWeight: 500,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTop: 1,
        borderTopColor: '#E5E7EB',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 700,
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 700,
        color: '#0ea5e9',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        paddingTop: 10,
        borderTop: 1,
        borderTopColor: '#EEEEEE',
        fontSize: 8,
        color: '#9CA3AF',
    },
});

interface InvoicePDFProps {
    data: PaymentReminderData;
    items?: InvoiceItem[];
}

export const InvoicePDF = ({ data, items = [] }: InvoicePDFProps) => {
    // Format currency helper
    const fmt = (amount: number) =>
        new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Faktura VAT</Text>
                        <Text style={styles.subtitle}>{data.invoice.invoice_number}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.partyDetail}>Data wystawienia: {data.invoice.issue_date}</Text>
                        <Text style={styles.partyDetail}>Termin płatności: {data.invoice.due_date}</Text>
                    </View>
                </View>

                {/* Seller & Buyer */}
                <View style={styles.partiesContainer}>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyLabel}>SPRZEDAWCA (WIERZYCIEL)</Text>
                        <Text style={styles.partyName}>{data.creditor.name}</Text>
                        <Text style={styles.partyDetail}>{data.creditor.address}</Text>
                        <Text style={styles.partyDetail}>{data.creditor.postal_code} {data.creditor.city}</Text>
                        <Text style={styles.partyDetail}>NIP: {data.creditor.nip}</Text>
                        {data.creditor.bank_account && (
                            <Text style={[styles.partyDetail, { marginTop: 4 }]}>
                                Konto: {data.creditor.bank_account}
                            </Text>
                        )}
                    </View>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyLabel}>NABYWCA (DŁUŻNIK)</Text>
                        <Text style={styles.partyName}>{data.debtor.name}</Text>
                        <Text style={styles.partyDetail}>{data.debtor.address}</Text>
                        <Text style={styles.partyDetail}>{data.debtor.postal_code} {data.debtor.city}</Text>
                        <Text style={styles.partyDetail}>NIP: {data.debtor.nip}</Text>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colNo]}>Lp.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDesc]}>Nazwa towaru/usługi</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Ilość</Text>
                        <Text style={[styles.tableHeaderCell, styles.colUnit]}>Jm.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Cena netto</Text>
                        <Text style={[styles.tableHeaderCell, styles.colVat]}>VAT</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>Wartość brutto</Text>
                    </View>

                    {items.length > 0 ? (
                        items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
                                <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
                                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                                <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
                                <Text style={[styles.tableCell, styles.colPrice]}>{fmt(item.unitPriceNet)}</Text>
                                <Text style={[styles.tableCell, styles.colVat]}>{item.vatRate}%</Text>
                                <Text style={[styles.tableCell, styles.colTotal]}>{fmt(item.totalGross)}</Text>
                            </View>
                        ))
                    ) : (
                        // Fallback if no items but we have total amount (Summary Invoice)
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.colNo]}>1</Text>
                            <Text style={[styles.tableCell, styles.colDesc]}>Usługa/Towar wg zestawienia</Text>
                            <Text style={[styles.tableCell, styles.colQty]}>1</Text>
                            <Text style={[styles.tableCell, styles.colUnit]}>szt</Text>
                            <Text style={[styles.tableCell, styles.colPrice]}>{fmt(Number(data.invoice.amount) / 1.23)}</Text>
                            <Text style={[styles.tableCell, styles.colVat]}>23%</Text>
                            <Text style={[styles.tableCell, styles.colTotal]}>{fmt(Number(data.invoice.amount))}</Text>
                        </View>
                    )}
                </View>

                {/* Summary */}
                <View style={styles.summary}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Kwota netto:</Text>
                            <Text style={styles.summaryValue}>
                                {items.length > 0
                                    ? fmt(items.reduce((s, i) => s + i.totalNet, 0))
                                    : fmt(Number(data.invoice.amount) / 1.23)} PLN
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Kwota VAT:</Text>
                            <Text style={styles.summaryValue}>
                                {items.length > 0
                                    ? fmt(items.reduce((s, i) => s + (i.totalGross - i.totalNet), 0))
                                    : fmt(Number(data.invoice.amount) * 0.23 / 1.23)} PLN
                            </Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>DO ZAPŁATY:</Text>
                            <Text style={styles.totalValue}>{fmt(Number(data.invoice.amount))} PLN</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.footer}>
                    Dokument wygenerowany automatycznie przez system VindycAItion z danych KSeF.
                </Text>
            </Page>
        </Document>
    );
};
