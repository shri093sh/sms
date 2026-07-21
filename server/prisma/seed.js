// Seeds demo data so Phase 3 (auth) and later phases have something to log
// in with and work against immediately. Mirrors the original app's
// demo-account login grid (admin / teacher / accountant).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("demo1234", 10);

  const [admin, teacher, accountant] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@prerana.demo" },
      update: {},
      create: { name: "Asha Rao", email: "admin@prerana.demo", passwordHash: password, role: "admin" }
    }),
    prisma.user.upsert({
      where: { email: "teacher@prerana.demo" },
      update: {},
      create: { name: "Vikram Shetty", email: "teacher@prerana.demo", passwordHash: password, role: "teacher" }
    }),
    prisma.user.upsert({
      where: { email: "accountant@prerana.demo" },
      update: {},
      create: { name: "Meera Nair", email: "accountant@prerana.demo", passwordHash: password, role: "accountant" }
    })
  ]);

  const students = [
    { name: "Anjali Kumar", rollNo: "01", className: "8", section: "A", guardianName: "Suresh Kumar", guardianPhone: "9900011122" },
    { name: "Rohit Devadiga", rollNo: "02", className: "8", section: "A", guardianName: "Prakash Devadiga", guardianPhone: "9900011123" },
    { name: "Sneha Poojary", rollNo: "01", className: "9", section: "B", guardianName: "Ganesh Poojary", guardianPhone: "9900011124" }
  ];

  for (const s of students) {
    const student = await prisma.student.upsert({
      where: { rollNo_className_section: { rollNo: s.rollNo, className: s.className, section: s.section } },
      update: {},
      create: s
    });

    const existingPlan = await prisma.feePlan.findFirst({ where: { studentId: student.id } });
    if (!existingPlan) {
      await prisma.feePlan.create({
        data: {
          studentId: student.id,
          totalAmount: 12000,
          installmentCount: 4,
          installments: {
            create: [
              { amount: 3000, dueDate: new Date("2026-04-10"), status: "paid", paidDate: new Date("2026-04-08") },
              { amount: 3000, dueDate: new Date("2026-06-10"), status: "paid", paidDate: new Date("2026-06-09") },
              { amount: 3000, dueDate: new Date("2026-08-10"), status: "pending" },
              { amount: 3000, dueDate: new Date("2026-10-10"), status: "pending" }
            ]
          }
        }
      });
    }
  }

  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", orgName: "Prerana SMS" }
  });

  console.log("Seed complete:", { admin: admin.email, teacher: teacher.email, accountant: accountant.email });
  console.log("Demo password for all seeded users: demo1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
