import {
    CustomerField,
    CustomersTableType,
    InvoiceForm,
    InvoicesTable,
    LatestInvoiceRaw,
    Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";

const prisma = new PrismaClient();

export async function fetchRevenue() {
    try {
        // Artificially delay a response for demo purposes.
        // Don't do this in production :)

        console.log("Fetching revenue data...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const data = await prisma.revenue.findMany();

        console.log("Data fetch completed after 3 seconds.");

        return data;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch revenue data.");
    }
}

export async function fetchLatestInvoices() {
    try {
        // await new Promise((resolve) => setTimeout(resolve, 6000));

        const data = await prisma.invoice.findMany({
            select: {
                id: true,
                amount: true,
                date: true,
                customer: {
                    select: {
                        name: true,
                        imageUrl: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                date: "desc",
            },
            take: 5,
        });

        // Format the amount field
        return data.map((invoice) => ({
            id: invoice.id,
            amount: formatCurrency(invoice.amount),
            name: invoice.customer.name,
            image_url: invoice.customer.imageUrl,
            email: invoice.customer.email,
        }));
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch the latest invoices.");
    }
}

export async function fetchCardData() {
    try {
        // Execute multiple queries in parallel
        const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
            prisma.invoice.count(),
            prisma.customer.count(),
            prisma.invoice.aggregate({
                _sum: {
                    amount: true,
                },
                _count: true,
                where: {
                    status: {
                        in: ["paid", "pending"],
                    },
                },
            }),
        ]);

        // Extract amounts for paid & pending invoices
        const totalPaidInvoices = formatCurrency(
            invoiceStatus._sum.amount ?? 0
        );
        const totalPendingInvoices = formatCurrency(invoiceStatus._count ?? 0);

        return {
            numberOfCustomers: customerCount,
            numberOfInvoices: invoiceCount,
            totalPaidInvoices,
            totalPendingInvoices,
        };
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch card data.");
    }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
    query: string,
    currentPage: number
) {
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;

    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                OR: [
                    {
                        customer: {
                            name: { contains: query, mode: "insensitive" },
                        },
                    },
                    {
                        customer: {
                            email: { contains: query, mode: "insensitive" },
                        },
                    },
                    {
                        amount: {
                            equals: isNaN(Number(query))
                                ? undefined
                                : Number(query),
                        },
                    },
                    {
                        date: {
                            equals: isNaN(Date.parse(query))
                                ? undefined
                                : new Date(query),
                        },
                    },
                    { status: { contains: query, mode: "insensitive" } },
                ],
            },
            orderBy: { date: "desc" },
            take: ITEMS_PER_PAGE,
            skip,
            select: {
                id: true,
                amount: true,
                date: true,
                status: true,
                customer: {
                    select: {
                        name: true,
                        email: true,
                        imageUrl: true,
                    },
                },
            },
        });

        return invoices.map((invoice) => ({
            id: invoice.id,
            amount: invoice.amount,
            date: invoice.date,
            status: invoice.status,
            name: invoice.customer.name,
            email: invoice.customer.email,
            image_url: invoice.customer.imageUrl,
        }));
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch invoices.");
    }
}

export async function fetchInvoicesPages(query: string) {
    try {
        const count = await prisma.invoice.count({
            where: {
                OR: [
                    {
                        customer: {
                            name: { contains: query, mode: "insensitive" },
                        },
                    },
                    {
                        customer: {
                            email: { contains: query, mode: "insensitive" },
                        },
                    },
                    {
                        amount: {
                            equals: isNaN(Number(query))
                                ? undefined
                                : Number(query),
                        },
                    },
                    {
                        date: {
                            equals: isNaN(Date.parse(query))
                                ? undefined
                                : new Date(query),
                        },
                    },
                    { status: { contains: query, mode: "insensitive" } },
                ],
            },
        });

        const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
        return totalPages;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch total number of invoices.");
    }
}

export async function fetchInvoiceById(id: string) {
    // Validate ID format before querying the database (if using MongoDB)
    if (!isValidObjectId(id)) {
        notFound(); // Redirect to Next.js not-found.tsx page
    }

    console.log("invoice[0]>> ", id);
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        select: {
            id: true,
            customerId: true,
            amount: true,
            status: true,
        },
    });

    if (!invoice) {
        notFound();
    }

    return {
        ...invoice,
        amount: invoice.amount / 100, // Convert amount from cents to dollars
    };
}
// ✅ Function to check if an ID is a valid MongoDB ObjectId
function isValidObjectId(id: string) {
    return /^[a-f\d]{24}$/i.test(id); // MongoDB ObjectId is a 24-character hex string
}
export async function fetchCustomers() {
    try {
        const customers = await prisma.customer.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return customers;
    } catch (err) {
        console.error("Database Error:", err);
        throw new Error("Failed to fetch all customers.");
    }
}

export async function fetchFilteredCustomers(query: string) {
    try {
        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                invoices: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        // 🔹 Process invoice-related calculations
        return customers.map((customer) => {
            const totalPaid = customer.invoices
                .filter((invoice) => invoice.status === "paid")
                .reduce((sum, invoice) => sum + invoice.amount, 0);

            const totalPending = customer.invoices
                .filter((invoice) => invoice.status === "pending")
                .reduce((sum, invoice) => sum + invoice.amount, 0);

            return {
                ...customer,
                total_pending: formatCurrency(totalPending),
                total_paid: formatCurrency(totalPaid),
            };
        });
    } catch (err) {
        console.error("Database Error:", err);
        throw new Error("Failed to fetch customer table.");
    }
}
