const { z } = require('zod');

// Wrap your existing rules inside a "body" object key
const UserLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address format"),
    password: z.string().min(1, "Password cannot be empty")
  })
});

module.exports = { UserLoginSchema };