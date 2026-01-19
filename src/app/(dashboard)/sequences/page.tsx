import Link from 'next/link';
import { Plus, Edit, Copy, Star, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { createClient } from '@/lib/supabase/server';

export default async function SequencesPage() {
    const supabase = await createClient();

    // Fetch real sequences from database
    const { data: sequences } = await supabase
        .from('sequences')
        .select(`
            *,
            sequence_steps (id)
        `)
        .order('created_at', { ascending: false });

    const sequencesList = sequences || [];

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Sekwencje</h1>
                    <p className="text-muted-foreground mt-1">
                        Zarządzaj sekwencjami windykacyjnymi
                    </p>
                </div>
                <Link href="/sequences/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nowa sekwencja
                    </Button>
                </Link>
            </div>

            {/* Info card */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                    <p className="text-sm">
                        💡 <strong>Sekwencja</strong> to zestaw kroków (emaili, SMS-ów), które są automatycznie wysyłane
                        do kontrahenta przed i po terminie płatności. Każdy krok ma określony dzień wysyłki
                        względem terminu płatności faktury.
                    </p>
                </CardContent>
            </Card>

            {/* Empty state */}
            {sequencesList.length === 0 && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <Layers className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak sekwencji</h3>
                        <p className="text-muted-foreground mb-4">
                            Utwórz pierwszą sekwencję windykacyjną
                        </p>
                        <Link href="/sequences/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Nowa sekwencja
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Sequences grid */}
            {sequencesList.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sequencesList.map((sequence) => (
                        <Card key={sequence.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {sequence.name}
                                            {sequence.is_default && (
                                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                            )}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {sequence.description || 'Brak opisu'}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Kroków</p>
                                        <p className="font-medium">{sequence.sequence_steps?.length || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Utworzono</p>
                                        <p className="font-medium">
                                            {new Date(sequence.created_at).toLocaleDateString('pl-PL')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {sequence.is_system && (
                                        <Badge variant="outline">Systemowa</Badge>
                                    )}
                                    {sequence.is_default && (
                                        <Badge variant="default">Domyślna</Badge>
                                    )}
                                </div>
                            </CardContent>
                            <div className="p-4 pt-0 border-t mt-auto">
                                <div className="flex gap-2">
                                    <Link href={`/sequences/${sequence.id}`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edytuj
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="sm">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    {!sequence.is_system && (
                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}

                    {/* Add new card */}
                    <Link href="/sequences/new">
                        <Card className="flex items-center justify-center min-h-[280px] border-dashed hover:border-primary/50 transition-colors cursor-pointer">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                                    <Plus className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="font-medium">Utwórz własną sekwencję</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Dostosuj do swoich potrzeb
                                </p>
                            </div>
                        </Card>
                    </Link>
                </div>
            )}
        </div>
    );
}
