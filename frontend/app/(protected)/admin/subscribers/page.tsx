"use client";

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Subscriber {
    id: string;
    email: string;
    active: boolean;
    createdAt: string;
}

export default function SubscribersPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.getSubscribers();
            setSubscribers(res.data || []);
        } catch (error) {
            console.error('Failed to fetch subscribers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    return (
        <div className="container py-10">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Newsletter Subscribers</h1>
                <Button onClick={fetchSubscribers} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Subscribers List ({subscribers.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Subscribed At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : subscribers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        No subscribers yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subscribers.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell>{sub.email}</TableCell>
                                        <TableCell>
                                            {sub.active ? (
                                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(sub.createdAt), 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
