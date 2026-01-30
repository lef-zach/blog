'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function UnsubscribePage() {
    const params = useParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsubscribe = async () => {
            try {
                const id = params.id as string;
                if (!id) throw new Error('Invalid unsubscribe link');

                const res = await apiClient.unsubscribe(id);
                setMessage(res.data.message);
                setStatus('success');
            } catch (error: any) {
                setMessage(error.message || 'Failed to unsubscribe');
                setStatus('error');
            }
        };

        unsubscribe();
    }, [params]);

    return (
        <div className="container flex h-[80vh] items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Newsletter Unsubscribe</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
                    {status === 'loading' && (
                        <p>Processing your request...</p>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                            <p className="text-lg font-medium">{message}</p>
                            <p className="text-muted-foreground">
                                We're sorry to see you go! You can always subscribe again from our footer.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href="/">Return Home</Link>
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="h-16 w-16 text-red-500" />
                            <p className="text-lg font-medium">{message}</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/">Return Home</Link>
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
