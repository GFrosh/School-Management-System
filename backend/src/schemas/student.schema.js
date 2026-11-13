const { z } = require("zod");

const GetStudentsQuerySchema = z.object({
    query: z.object({
        q: z.string().trim().optional(), // Search by name or admission number
        classId: z.string().uuid().optional(),
        sessionId: z.string().uuid().optional(),
        status: z.enum(['active', 'withdrawn', 'graduated', 'suspended', 'inactive']).optional(),
        page: z.string().regex(/^\d+/).transform(Number).optional().default('1'),
        pageSize: z.string().regex(/^\d+/).transform(Number).optional().default('25')
            .transform((val) => Math.min(val, 100)),
    })
});

module.exports = { GetStudentsQuerySchema };
