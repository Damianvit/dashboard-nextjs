import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

const prisma = new PrismaClient();

async function seedUsers() {
    const hashedUsers = await Promise.all(
        users.map(async (user) => ({
            ...user,
            password: await bcrypt.hash(user.password, 10),
        }))
    );

    await prisma.user.createMany({
        data: hashedUsers,
        skipDuplicates: true,
    });
}

async function seedCustomers() {
    await prisma.customer.createMany({
        data: customers,
        skipDuplicates: true,
    });
}

async function seedInvoices() {
    const invoicesWithObjectIds = invoices.map((invoice) => ({
        ...invoice,
        customerId: invoice.customer_id, // Ensure this is an ObjectId-compatible string
    }));

    await prisma.invoice.createMany({
        data: invoicesWithObjectIds,
        skipDuplicates: true,
    });
}

async function seedRevenue() {
    await prisma.revenue.createMany({
        data: revenue,
        skipDuplicates: true,
    });
}

export async function GET() {
    try {
        await seedUsers();
        await seedCustomers();
        await seedInvoices();
        await seedRevenue();

        return Response.json({ message: "Database seeded successfully" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
