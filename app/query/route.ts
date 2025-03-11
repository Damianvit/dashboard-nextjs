import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listInvoices() {
    const data = await prisma.invoice.findMany({
        where: { amount: 666 }, // Filter for invoices with amount 666
        select: {
            amount: true,
            customer: {
                select: { name: true }, // Get the customer's name
            },
        },
    });

    return data;
}

export async function GET() {
    try {
        return Response.json(await listInvoices());
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
