const { z } = require("zod");

const CreateSessionSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Session name is required (e.g., 2026/2027)"),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
        isCurrent: z.boolean().optional().default(false)
    }).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
        message: "End date must be greater than start date",
        path: ["endDate"]
    })
});


const UpdateSessionSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        isCurrent: z.boolean().optional()
    }),
    params: z.object({
        id: z.uuid("Invalid user ID format")
    })
});


const CreateTermSchema = z.object({
    body: z.object({
        sequence: z.number().int().min(1).max(3),
        name: z.string().min(1),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    }).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
        message: "Term end date must be greater than start date",
        path: ["endDate"]
    })
});

module.exports = { CreateSessionSchema, CreateTermSchema, UpdateSessionSchema };
