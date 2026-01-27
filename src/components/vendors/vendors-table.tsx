'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Trash, Edit, Mail, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Vendor } from '@/types/database';
import { deleteVendor } from '@/app/actions/vendor-actions';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VendorsTableProps {
    vendors: Vendor[];
}

type SortField = 'name' | 'nip' | 'city';
type SortDirection = 'asc' | 'desc';

export function VendorsTable({ vendors }: VendorsTableProps) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const filteredVendors = useMemo(() => {
        let result = [...vendors];

        if (search.trim()) {
            const searchLower = search.toLowerCase();
            result = result.filter(vendor =>
                vendor.name.toLowerCase().includes(searchLower) ||
                (vendor.nip || '').includes(searchLower) ||
                (vendor.email || '').toLowerCase().includes(searchLower)
            );
        }

        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'nip':
                    comparison = (a.nip || '').localeCompare(b.nip || '');
                    break;
                case 'city':
                    comparison = (a.city || '').localeCompare(b.city || '');
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [vendors, search, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        const result = await deleteVendor(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Dostawca usunięty');
        }
        setIsDeleting(null);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Szukaj dostawcy (nazwa, NIP, email)..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left p-4 font-medium">
                                        <button className="flex items-center hover:text-primary" onClick={() => handleSort('name')}>
                                            Nazwa <SortIcon field="name" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">
                                        <button className="flex items-center hover:text-primary" onClick={() => handleSort('nip')}>
                                            NIP <SortIcon field="nip" />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-medium">Kontakt</th>
                                    <th className="text-left p-4 font-medium">Konto bankowe</th>
                                    <th className="text-right p-4 font-medium">Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVendors.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Brak dostawców
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVendors.map((vendor) => (
                                        <tr key={vendor.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium">{vendor.name}</div>
                                                <div className="text-xs text-muted-foreground">{vendor.city}</div>
                                            </td>
                                            <td className="p-4 font-mono text-sm">{vendor.nip || '-'}</td>
                                            <td className="p-4 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    {vendor.email && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Mail className="h-3 w-3" /> {vendor.email}
                                                        </div>
                                                    )}
                                                    {vendor.phone && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Phone className="h-3 w-3" /> {vendor.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm">
                                                {vendor.bank_account_number ? (
                                                    <div>
                                                        <span className="font-mono">{vendor.bank_account_number}</span>
                                                        {vendor.bank_name && <div className="text-xs text-muted-foreground">{vendor.bank_name}</div>}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/vendors/${vendor.id}/edit`}>
                                                        <Button variant="ghost" size="icon">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Czy na pewno chcesz usunąć tego dostawcę?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tej operacji nie można cofnąć.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(vendor.id)}
                                                                    className="bg-red-500 hover:bg-red-600"
                                                                >
                                                                    {isDeleting === vendor.id ? 'Usuwanie...' : 'Usuń'}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
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
