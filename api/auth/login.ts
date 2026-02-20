import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureTables } from '../lib/db';

const JWT_SECRET = process.env.SECRET_KEY || 'dev-secret-key-change-in-production';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

    try {
        await ensureTables();

        const { username, email, password } = req.body;
        const userEmail = email || username;

        if (!userEmail || !password) {
            return res.status(400).json({ detail: 'Credentials required' });
        }

        const result = await sql`SELECT * FROM users WHERE email = ${userEmail}`;
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ detail: 'Incorrect email or password' });
        }

        if (user.status !== 'approved') {
            return res.status(403).json({ detail: `Account not approved yet. Status: ${user.status}` });
        }

        const token = jwt.sign(
            { sub: user.email, role: user.role, status: user.status, version: user.token_version },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        const refreshToken = jwt.sign(
            { sub: user.email, version: user.token_version, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            access_token: token,
            refresh_token: refreshToken,
            token_type: 'bearer'
        });
    } catch (error: any) {
        console.error('Login Error:', error);
        return res.status(500).json({ detail: error.message });
    }
}
