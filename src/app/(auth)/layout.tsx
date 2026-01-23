import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'FluintyDebt - Logowanie',
    description: 'Zaloguj się do platformy FluintyDebt',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white p-12 flex-col justify-between">
                <div>
                    <h1 className="text-3xl font-bold">FluintyDebt</h1>
                    <p className="text-primary-200 mt-1">AI-powered debt collection</p>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-4xl font-bold leading-tight">
                            Odzyskuj należności
                            <br />
                            szybciej i skuteczniej
                        </h2>
                        <p className="mt-4 text-lg text-primary-200 max-w-md">
                            Automatyzuj windykację, oszczędzaj czas i zwiększaj
                            płynność finansową swojej firmy.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 pt-8">
                        <div>
                            <p className="text-3xl font-bold">84%</p>
                            <p className="text-primary-300 text-sm">firm ma problemy z płatnościami</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">10h+</p>
                            <p className="text-primary-300 text-sm">oszczędzasz miesięcznie</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">76%</p>
                            <p className="text-primary-300 text-sm">skuteczność w 30 dni</p>
                        </div>
                    </div>
                </div>

                <p className="text-primary-400 text-sm">
                    © 2026 FluintyDebt. Wszystkie prawa zastrzeżone.
                </p>
            </div>

            {/* Right side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
