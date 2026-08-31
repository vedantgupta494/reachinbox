import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sender = await prisma.sender.upsert({
    where: { emailAddress: "demo@reachinbox.test" },
    update: {},
    create: {
      name: "Demo Sender",
      emailAddress: "demo@reachinbox.test",
      maxEmailsPerHour: 10, // deliberately low so you can DEMO rate limiting easily
      minDelayBetweenSendMs: 2000,
    },
  });

  console.log("Seeded sender:", sender);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
