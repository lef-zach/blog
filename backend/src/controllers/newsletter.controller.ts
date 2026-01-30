import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/error.util';
import { z } from 'zod';

const prisma = new PrismaClient();

const subscribeSchema = z.object({
    email: z.string().email(),
});

export const newsletterController = {
    // Public: Subscribe
    async subscribe(req: Request, res: Response) {
        try {
            const { email } = subscribeSchema.parse(req.body);

            // Check if already subscribed
            const existing = await prisma.subscriber.findUnique({
                where: { email },
            });

            if (existing) {
                if (!existing.active) {
                    // Reactivate
                    await prisma.subscriber.update({
                        where: { id: existing.id },
                        data: { active: true },
                    });
                    return res.json({ message: 'Welcome back! You have been resubscribed.' });
                }
                return res.json({ message: 'You are already subscribed.' });
            }

            await prisma.subscriber.create({
                data: { email },
            });

            res.status(201).json({ message: 'Successfully subscribed to the newsletter!' });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                throw new AppError(400, 'VALIDATION_ERROR', 'Invalid email address');
            }
            throw new AppError(500, 'SUBSCRIBE_ERROR', 'Failed to subscribe');
        }
    },

    // Public: Unsubscribe
    async unsubscribe(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.subscriber.update({
                where: { id },
                data: { active: false },
            });
            res.json({ message: 'You have been unsubscribed.' });
        } catch (error) {
            throw new AppError(500, 'UNSUBSCRIBE_ERROR', 'Failed to unsubscribe');
        }
    },

    // Admin: Get Subscribers
    async getSubscribers(req: Request, res: Response) {
        try {
            const subscribers = await prisma.subscriber.findMany({
                orderBy: { createdAt: 'desc' },
            });
            res.json({ data: subscribers });
        } catch (error) {
            throw new AppError(500, 'FETCH_ERROR', 'Failed to fetch subscribers');
        }
    }
};
