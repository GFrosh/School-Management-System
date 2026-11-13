const { z } = require("zod");

const CreateClassSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Class name cannot be empty").max(5, "Invalid class name entered"),
        level: z.coerce.number().int().min(1).max(6)
    })
});

const UpdateClassSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(5).optional(),
        level: z.coerce.number().int().min(1).max(12).optional(),
        classTeacherId: z.string().uuid().nullable().optional(),
    }),
    params: z.object({ id: z.string().uuid() }),
});

module.exports = { CreateClassSchema, UpdateClassSchema };
