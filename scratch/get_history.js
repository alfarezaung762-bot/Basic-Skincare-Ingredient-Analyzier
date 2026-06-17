Q// scratch/get_history.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const histories = await prisma.analysisHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  for (const h of histories) {
    console.log(`History ID: ${h.id}`);
    console.log(`Product: ${h.productName}`);
    console.log(`Match Score: ${h.matchScore}`);
    console.log(`Safety Score: ${h.safetyScore}`);
    console.log(`AI Response KEYS:`, Object.keys(h.aiResponse));
    console.log(`AI Response:`, JSON.stringify(h.aiResponse, null, 2));
    console.log(`-----------------------------------`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
