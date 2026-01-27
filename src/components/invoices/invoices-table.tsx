'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/invoices/status-badge';
import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate, formatOverdueDays } from '@/lib/utils/format-date';

interface Invoice {
    id: string;
    invoice_number: string;
    amount: number;
    amount_net?: number;
    vat_rate?: string;
    vat_amount?: number;
    amount_gross?: number;
    due_date: string;
    debtor_id: string;
    debtors: { name: string } | null;
    calculatedStatus: 'pending' | 'paid' | 'partial' | 'overdue' | 'paused' | 'written_off' | 'due_soon';
    daysOverdue: number;
}

interface InvoicesTableProps {
    invoices: Invoice[];
    initialStatusFilter?: string;
}

type SortField = 'invoice_number' | 'debtor' | 'amount' | 'due_date' | 'status';
type SortDirection = 'asc' | 'desc';

export function InvoicesTable({ invoices, initialStatusFilter = 'all' }: InvoicesTableProps) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [sortField, setSortField] = useState<SortField>('due_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Filter and sort invoices
    const filteredInvoices = useMemo(() => {
        let result = [...invoices];

        // Search filter
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            result = result.filter(inv =>
                inv.invoice_number.toLowerCase().includes(searchLower) ||
                (inv.debtors?.name || '').toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (statusFilter === 'unpaid') {
            result = result.filter(inv => inv.calculatedStatus !== 'paid');
        } else if (statusFilter !== 'all') {
            result = result.filter(inv => inv.calculatedStatus === statusFilter);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'invoice_number':
                    comparison = a.invoice_number.localeCompare(b.invoice_number);
                    break;
                case 'debtor':
                    comparison = (a.debtors?.name || '').localeCompare(b.debtors?.name || '');
                    break;
                case 'amount':
                    comparison = Number(a.amount) - Number(b.amount);
                    break;
                case 'due_date':
                    comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    break;
                case 'status':
                    const statusOrder: Record<string, number> = { overdue: 0, due_soon: 1, pending: 2, partial: 3, paid: 4 };
                    comparison = (statusOrder[a.calculatedStatus] || 5) - (statusOrder[b.calculatedStatus] || 5);
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [invoices, search, statusFilter, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc'
            ? <ArrowUp className="h-4 w-4 ml-1" />
            : <ArrowDown className="h-4 w-4 ml-1" />;
    };

    return (
        <>
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Szukaj po numerze faktury lub kontrahencie..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unpaid">Do spłaty (Aktywne)</SelectItem>
                                <SelectItem value="all">Wszystkie</SelectItem>
                                <SelectItem value="pending">Oczekujące</SelectItem>
                                <SelectItem value="due_soon">Bliski termin</SelectItem>
                                <SelectItem value="overdue">Przeterminowane</SelectItem>
                                <SelectItem value="paid">Opłacone</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {(search || statusFilter !== 'all') && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Wyniki: {filteredInvoices.length} z {invoices.length}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                            >
                                Wyczyść filtry
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left p-4 font-medium">
                                        <button
                                            className="flex items-center hover:text-primary"
                                            onClick={() => handleSort('invoice_number')}
                                        >
                                            Numer
                                            <SortIcon field="invoice_number" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">
                                        <button
                                            className="flex items-center hover:text-primary"
                                            onClick={() => handleSort('debtor')}
                                        >
                                            Kontrahent
                                            <SortIcon field="debtor" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">
                                        <button
                                            className="flex items-center hover:text-primary"
                                            onClick={() => handleSort('amount')}
                                        >
                                            Kwota
                                            <SortIcon field="amount" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">
                                        <button
                                            className="flex items-center hover:text-primary"
                                            onClick={() => handleSort('due_date')}
                                        >
                                            Termin
                                            <SortIcon field="due_date" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">
                                        <button
                                            className="flex items-center hover:text-primary"
                                            onClick={() => handleSort('status')}
                                        >
                                            Status
                                            <SortIcon field="status" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Brak faktur spełniających kryteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <Link href={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">
                                                    {invoice.invoice_number}
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                <Link href={`/debtors/${invoice.debtor_id}`} className="hover:underline">
                                                    {invoice.debtors?.name || 'Nieznany'}
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                <div className={invoice.calculatedStatus === 'overdue' ? 'text-red-600' : ''}>
                                                    <span className="font-semibold">{formatCurrency(invoice.amount_gross || invoice.amount)}</span>
                                                    {invoice.amount_net && (
                                                        <div className="text-xs text-muted-foreground">
                                                            netto: {formatCurrency(invoice.amount_net)}
                                                            {invoice.vat_rate && ` • VAT ${invoice.vat_rate}%`}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div>{formatDate(invoice.due_date)}</div>
                                                {invoice.daysOverdue > 0 && invoice.calculatedStatus !== 'paid' && (
                                                    <div className="text-xs text-red-600">
                                                        {formatOverdueDays(invoice.daysOverdue)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <StatusBadge status={invoice.calculatedStatus} />
                                            </td>
                                            <td className="p-4">
                                                <Link href={`/invoices/${invoice.id}`}>
                                                    <Button variant="ghost" size="sm">Szczegóły</Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
