import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function seedUsers(users) {
    if (!Array.isArray(users)) {
        throw new Error("Users must be an array");
    }

    const uniqueUsers = users.filter((user, index, self) => {
        return self.findIndex((u) => u.email === user.email) === index;
    });

    const userPromises = uniqueUsers.map(async (user) => {
        try {
            const hashedPassword = await bcrypt.hash(
                user.password,
                SALT_ROUNDS
            );
            return prisma.user.upsert({
                where: { email: user.email },
                update: {
                    /* Add fields to update existing users */
                },
                create: {
                    name: user.name,
                    email: user.email,
                    password: hashedPassword,
                },
            });
        } catch (error) {
            throw new Error(
                `Failed to seed user ${user.email}: ${error.message}`
            );
        }
    });

    return Promise.all(userPromises).catch((error) => {
        throw new Error(`Failed to seed users: ${error.message}`);
    });
}

async function seedCustomers() {
    if (!Array.isArray(customers)) {
        throw new Error("Customers must be an array");
    }

    try {
        const customerPromises = customers.map((customer) =>
            prisma.customer.upsert({
                where: { email: customer.email }, // Now this will work
                update: {},
                create: {
                    name: customer.name,
                    email: customer.email,
                    imageUrl: customer.image_url,
                },
            })
        );

        return await Promise.all(customerPromises);
    } catch (error) {
        throw new Error(
            `Failed to seed customers: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

async function seedInvoices() {
    try {
        // 🔹 Fetch all customers from the database
        const allCustomers = await prisma.customer.findMany({
            select: { id: true, email: true }, // Fetch actual IDs and emails
        });

        // 🔹 Create a map of emails → database customer IDs
        const customerMap = new Map(
            allCustomers.map((customer) => [customer.email, customer.id])
        );

        console.log("Customer Mapping:", customerMap);

        // 🔹 Insert invoices with correct customer IDs
        const invoicePromises = invoices.map((invoice) => {
            const customerId = customerMap.get(
                customers.find((c) => c.id === invoice.customer_id)?.email // Match by email instead
            );

            if (!customerId) {
                throw new Error(
                    `No matching customer found for customer_id: ${invoice.customer_id}`
                );
            }

            return prisma.invoice.create({
                data: {
                    customerId,
                    amount: invoice.amount,
                    status: invoice.status,
                    date: new Date(invoice.date),
                },
            });
        });

        await Promise.all(invoicePromises);
        console.log("✅ Invoices seeded successfully.");
    } catch (error) {
        console.error(`❌ Failed to seed invoices: ${error.message}`);
    }
}

async function seedRevenue() {
    try {
        const revenuePromises = revenue.map((rev) =>
            prisma.revenue.upsert({
                where: { month: rev.month },
                update: {},
                create: {
                    month: rev.month,
                    revenue: rev.revenue,
                },
            })
        );

        return await Promise.all(revenuePromises);
    } catch (error) {
        throw new Error(
            `Failed to seed revenue: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

export async function GET() {
    try {
        // Seed in sequence to maintain dependencies
        await seedUsers(users);
        const customers = await seedCustomers();
        await seedInvoices(invoices);
        const revenue = await seedRevenue();

        return Response.json({
            message: "Database seeded successfully",
            counts: {
                users: customers.length,
                customers: customers.length,
                invoices: invoices.length,
                revenue: revenue.length,
            },
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Seeding error:", errorMessage);
        return Response.json({ error: errorMessage }, { status: 500 });
    } finally {
        await prisma.$disconnect().catch((error) => {
            console.error("Error disconnecting Prisma:", error);
        });
    }
}
