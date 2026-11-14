const { z } = require('zod');

const UserLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address format"),
    password: z.string().min(1, "Password cannot be empty")
  })
});


const passwordChangeSchema = z.object({
  body: z.object({
    userId: z.string().uuid("Invalid user ID format"),
    currentPassword: z.string().min(1, "Current password cannot be empty"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long")
      .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
  })
})

const CreateUserFromProfileSchema = z.object({
  body: z.object({
    profileType: z.enum(['parent', 'teacher', 'student', 'staff']),
    profileId: z.string().uuid(),
    email: z.string().email(),
    password: z.string().min(8).regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  }),
});

module.exports = { UserLoginSchema, passwordChangeSchema, CreateUserFromProfileSchema };
