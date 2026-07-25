import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (!process.env.DATABASE_URL) {
        return res.status(503).json({
            error: 'Database unavailable',
            detail: 'DATABASE_URL is not configured'
        });
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        // Ensure table exists (idempotent for first deploy)
        await sql`
            CREATE TABLE IF NOT EXISTS gardens (
                user_id TEXT PRIMARY KEY,
                plants_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `;

        if (req.method === 'POST') {
            const { userId, plants } = req.body || {};
            if (!userId || typeof userId !== 'string') {
                return res.status(400).json({ error: 'userId is required' });
            }
            if (!Array.isArray(plants)) {
                return res.status(400).json({ error: 'plants must be an array' });
            }
            // Cap payload size roughly (large base64 images)
            const payload = JSON.stringify(plants);
            if (payload.length > 4_000_000) {
                return res.status(413).json({ error: 'Garden payload too large' });
            }

            // Store as JSON text; column is JSONB and Postgres will coerce
            await sql`
                INSERT INTO gardens (user_id, plants_json)
                VALUES (${userId}, ${payload})
                ON CONFLICT (user_id)
                DO UPDATE SET plants_json = EXCLUDED.plants_json, updated_at = NOW()
            `;
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const uid = req.query?.uid;
            if (!uid || typeof uid !== 'string') {
                return res.status(400).json({ error: 'uid query parameter is required' });
            }
            const result = await sql`
                SELECT plants_json FROM gardens WHERE user_id = ${uid} LIMIT 1
            `;
            const plants = result[0]?.plants_json ?? [];
            return res.status(200).json({ plants });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Neon Error:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}
