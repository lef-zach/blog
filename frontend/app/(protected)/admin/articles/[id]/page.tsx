'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ArticleRedirectPage() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        if (params.id) {
            router.replace(`/admin/articles/${params.id}/edit`);
        }
    }, [params.id, router]);

    return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Redirecting to editor...</span>
        </div>
    );
}
