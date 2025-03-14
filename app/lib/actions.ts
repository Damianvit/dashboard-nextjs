"use server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(["pending", "paid"]),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];
    await prisma.invoice.create({
        data: {
            customer: {
                connect: { id: customerId }, // Linking to an existing customer
            },
            amount: amountInCents,
            status: status,
            date: new Date(date),
        },
    });
    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
    console.log("Invoice Id >>>", id);
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    const amountInCents = amount * 100;

    await prisma.invoice.update({
        where: { id },
        data: {
            customer: {
                connect: { id: customerId }, // Connect to an existing customer
            },
            amount: amountInCents,
            status,
        },
    });
    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
    await prisma.invoice.delete({
        where: { id },
    });
    revalidatePath("/dashboard/invoices");
}
