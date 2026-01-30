const { PrismaClient } = require('@prisma/client');
const paperService = require('../dist/services/paper.service').default;

const prisma = new PrismaClient();

async function main() {
    console.log('--- Triggering Sync ---');

    // Find admin with most papers
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: {
            _count: {
                select: { papers: true }
            }
        }
    });

    if (!admins.length) {
        console.error('No admins found');
        process.exit(1);
    }

    const admin = admins.sort((a, b) => b._count.papers - a._count.papers)[0];
    console.log(`Syncing for Admin: ${admin.id} (${admin._count.papers} papers)`);

    if (!admin.scholarUrl) {
        console.error('Admin has no Scholar URL');
        // process.exit(1); 
        // Actually, maybe provided in env? NO, must be in DB.
    }

    try {
        const result = await paperService.syncFromScholar(admin.scholarUrl, admin.id);
        console.log('Sync Result:', result);

        // Check URLs
        const updatedPapers = await prisma.paper.findMany({
            where: { userId: admin.id, url: { not: null } }
        });
        console.log(`Papers with URLs now: ${updatedPapers.length}`);

    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
