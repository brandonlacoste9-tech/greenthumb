import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const { userId, plants } = req.body;

    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: 'Neon Database URL not configured' });
    }

    try {
        if (req.method === 'POST') {
            // Upsert: Create or Update user garden
            await sql`
                INSERT INTO gardens (user_id, plants_json)
                VALUES (${userId}, ${JSON.stringify(plants)})
                ON CONFLICT (user_id) 
                DO UPDATE SET plants_json = ${JSON.stringify(plants)}, updated_at = NOW()
            `;
            return res.status(200).json({ success: true });
        } 
        
        if (req.method === 'GET') {
            const { uid } = req.query;
            const result = await sql`SELECT plants_json FROM gardens WHERE user_id = ${uid}`;
            return res.status(200).json({ plants: result[0]?.plants_json || [] });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Neon Error:', error);
        res.status(500).json({ error: 'Database operation failed' });
    }
}
