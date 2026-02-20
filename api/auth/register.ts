import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { ensureTables } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

    try {
        await ensureTables();

        const { email, password, full_name, role } = req.body;
        if (!email || !password) return res.status(400).json({ detail: 'Email and password required' });

        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.rows.length > 0) {
            return res.status(400).json({ detail: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await sql`
      INSERT INTO users (email, password_hash, full_name, role, status)
      VALUES (${email}, ${hashedPassword}, ${full_name || email.split('@')[0]}, ${role || 'user'}, 'pending')
      RETURNING id, email, full_name, role, status
    `;

        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Registration Error:', error);
        return res.status(500).json({ detail: error.message });
    }
}
