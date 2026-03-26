import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { LoginRequestSchema } from '@process-flow/shared';
import { JWT_SECRET } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const result = LoginRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }
  const { username, password } = result.data;

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});
