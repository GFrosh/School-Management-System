const { z } = require("zod");

const CreateClassSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Class name cannot be empty").max(5, "Invalid class name entered"),
        level: z.coerce.number().int().min(1).max(6)
    })
});

module.exports = { CreateClassSchema };
