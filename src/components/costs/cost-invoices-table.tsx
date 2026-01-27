'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Receipt, QrCode, MoreHorizontal, Check, Loader2 } from 'lucide-react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { markCostInvoiceAsPaid } from '@/app/actions/cost-actions';
import { CostStatusBadge } from '@/components/costs/cost-status-badge';
import { PayWithQR } from '@/components/costs/pay-with-qr';
import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate, formatOverdueDays } from '@/lib/utils/format-date';
import type { CostInvoice } from '@/types';

interface CostInvoicesTableProps {
    invoices: CostInvoice[];
}

type SortField = 'invoice_number' | 'contractor' | 'amount' | 'due_date' | 'status';
type SortDirection = 'asc' | 'desc';

function CostInvoiceActions({ invoice }: { invoice: CostInvoice }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleMarkAsPaid = async () => {
        setIsLoading(true);
        try {
            const result = await markCostInvoiceAsPaid(invoice.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Faktura oznaczona jako opłacona');
            }
        } catch (error) {
            toast.error('Wystąpił błąd');
        } finally {
            setIsLoading(false);
        }
    };

    if (invoice.payment_status === 'paid') {
        return (
            <span className="text-xs text-muted-foreground mr-2 whitespace-nowrap">
                {invoice.paid_at ? formatDate(invoice.paid_at) : 'Opłacona'}
            </span>
        );
    }

    return (
        <div className="flex items-center justify-end gap-2">
            {invoice.account_number && (
                <PayWithQR
                    invoiceNumber={invoice.invoice_number}
                    accountNumber={invoice.account_number}
                    amount={Number(invoice.amount)}
                    contractorName={invoice.contractor_name}
                />
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Otwórz menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={handleMarkAsPaid}
                        disabled={isLoading}
                        className="cursor-pointer"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="mr-2 h-4 w-4 text-green-600" />
                        )}
                        Oznacz jako opłaconą
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}


export function CostInvoicesTable({ invoices }: CostInvoicesTableProps) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState<SortField>('due_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc'); // Default asc (soonest due first)

    // Calculate display status for each invoice
    const enhancedInvoices = useMemo(() => {
        return invoices.map(inv => {
            let displayStatus: string = inv.payment_status;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(inv.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (inv.payment_status !== 'paid') {
                if (daysDiff < 0) {
                    displayStatus = 'overdue';
                } else if (daysDiff <= 3) {
                    displayStatus = 'due_soon';
                }
            }

            return {
                ...inv,
                displayStatus,
                daysDiff,
            };
        });
    }, [invoices]);

    // Filter and sort
    const filteredInvoices = useMemo(() => {
        let result = [...enhancedInvoices];

        // Search
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            result = result.filter(inv =>
                inv.invoice_number.toLowerCase().includes(searchLower) ||
                inv.contractor_name.toLowerCase().includes(searchLower) ||
                (inv.contractor_nip || '').includes(searchLower)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(inv => inv.displayStatus === statusFilter);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'invoice_number':
                    comparison = a.invoice_number.localeCompare(b.invoice_number);
                    break;
                case 'contractor':
                    comparison = a.contractor_name.localeCompare(b.contractor_name);
                    break;
                case 'amount':
                    comparison = Number(a.amount) - Number(b.amount);
                    break;
                case 'due_date':
                    comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    break;
                case 'status':
                    const statusOrder: Record<string, number> = { overdue: 0, due_soon: 1, to_pay: 2, paid: 3 };
                    comparison = (statusOrder[a.displayStatus] || 4) - (statusOrder[b.displayStatus] || 4);
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [enhancedInvoices, search, statusFilter, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="h-4 w-4 ml-1" />
            : <ArrowDown className="h-4 w-4 ml-1" />;
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Szukaj (nr faktury, dostawca, NIP)..."
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
                            <SelectItem value="all">Wszystkie</SelectItem>
                            <SelectItem value="to_pay">Do zapłaty</SelectItem>
                            <SelectItem value="due_soon">Bliski termin</SelectItem>
                            <SelectItem value="overdue">Przeterminowane</SelectItem>
                            <SelectItem value="paid">Opłacone</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href="/costs/new">
                            <Receipt className="mr-2 h-4 w-4" />
                            Dodaj fakturę
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                                    <th className="text-left p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('invoice_number')}>
                                        <div className="flex items-center">Numer <SortIcon field="invoice_number" /></div>
                                    </th>
                                    <th className="text-left p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('contractor')}>
                                        <div className="flex items-center">Dostawca <SortIcon field="contractor" /></div>
                                    </th>
                                    <th className="text-left p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center">Kwota <SortIcon field="amount" /></div>
                                    </th>
                                    <th className="text-left p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('due_date')}>
                                        <div className="flex items-center">Termin <SortIcon field="due_date" /></div>
                                    </th>
                                    <th className="text-left p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                                        <div className="flex items-center">Status <SortIcon field="status" /></div>
                                    </th>
                                    <th className="text-right p-4 font-medium">Akcje</th>
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
                                            <td className="p-4 font-medium">
                                                {invoice.invoice_number}
                                                {invoice.category && (
                                                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                                                        {invoice.category}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium">{invoice.contractor_name}</div>
                                                {invoice.contractor_nip && (
                                                    <div className="text-xs text-muted-foreground">NIP: {invoice.contractor_nip}</div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold">{formatCurrency(invoice.amount)}</div>
                                            </td>
                                            <td className="p-4">
                                                <div>{formatDate(invoice.due_date)}</div>
                                                {invoice.displayStatus === 'overdue' && (
                                                    <div className="text-xs text-red-600 font-medium">
                                                        {formatOverdueDays(Math.abs(invoice.daysDiff))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <CostStatusBadge status={invoice.displayStatus} />
                                            </td>
                                            <td className="p-4 text-right">
                                                <CostInvoiceActions invoice={invoice} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
