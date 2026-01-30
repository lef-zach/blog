'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';

export default function AboutEditorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [articles, setArticles] = useState<any[]>([]);
    const [selectedArticleId, setSelectedArticleId] = useState<string>('');
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        const checkSettings = async () => {
            try {
                const [settingsRes, articlesRes] = await Promise.all([
                    apiClient.getSettings(),
                    apiClient.getArticles({ limit: 100 }) // Fetch reasonable amount
                ]);

                const settings = settingsRes.data;
                setArticles(articlesRes.data.articles || []);

                if (settings.aboutArticleId) {
                    // Check if article actually exists in the list (or fetch it individually to be sure?)
                    // For now, if ID exists, we try to access it. If 404, the user can come back here.
                    // But wait, if we redirect immediately, they get stuck in 404.
                    // Let's NOT redirect automatically if it causes issues.
                    // Or better, verify it exists first.
                    try {
                        await apiClient.getArticle(settings.aboutArticleId);
                        // Exists -> Redirect
                        router.push(`/admin/articles/${settings.aboutArticleId}/edit`);
                    } catch (e) {
                        // Does not exist -> Clear setting and stay here
                        setError('Previous About page not found. Please create or select a new one.');
                        await apiClient.updateSettings({ ...settings, aboutArticleId: null });
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                setError('Failed to fetch data');
                setLoading(false);
            }
        };

        checkSettings();
    }, [router]);

    const handleSelectArticle = async () => {
        if (!selectedArticleId) return;
        try {
            setLoading(true);
            const settingsRes = await apiClient.getSettings();
            await apiClient.updateSettings({
                ...settingsRes.data,
                aboutArticleId: selectedArticleId
            });
            router.push(`/admin/articles/${selectedArticleId}/edit`);
        } catch (err: any) {
            setError(err.message || 'Failed to update settings');
            setLoading(false);
        }
    };

    const createAboutPage = async () => {
        try {
            setLoading(true);
            const articleRes = await apiClient.createArticle({
                title: 'About Me',
                content: 'Write something about yourself...',
                excerpt: 'About page content',
                status: 'DRAFT',
                tags: ['about'],
                category: 'Personal',
                visibility: 'PUBLIC'
            });

            const articleId = articleRes.data.id;

            const settingsRes = await apiClient.getSettings();
            await apiClient.updateSettings({
                ...settingsRes.data,
                aboutArticleId: articleId
            });

            router.push(`/admin/articles/${articleId}/edit`);

        } catch (err: any) {
            setError(err.message || 'Failed to create about page');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Checking About page status...</span>
            </div>
        );
    }

    return (
        <div className="container py-12">
            <div className="mx-auto max-w-xl">
                <Card>
                    <CardHeader>
                        <CardTitle>About Page Setup</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-muted-foreground">
                            You haven't set a functional "About" page yet.
                        </p>

                        {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/20">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Option 1: Create New</h3>
                            <Button onClick={createAboutPage} className="w-full">
                                <FileText className="mr-2 h-4 w-4" />
                                Create New About Page
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or select existing
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Option 2: Select Existing</h3>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedArticleId}
                                onChange={(e) => setSelectedArticleId(e.target.value)}
                            >
                                <option value="">Select an article...</option>
                                {articles.map(article => (
                                    <option key={article.id} value={article.id}>
                                        {article.title} ({article.status})
                                    </option>
                                ))}
                            </select>
                            <Button
                                onClick={handleSelectArticle}
                                variant="secondary"
                                className="w-full"
                                disabled={!selectedArticleId}
                            >
                                Use Selected Article
                            </Button>
                        </div>

                        <Button variant="ghost" onClick={() => router.push('/admin/settings')} className="w-full">
                            Cancel
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
