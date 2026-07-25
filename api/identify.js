import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    // CORS for local static previews that proxy API separately
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.PLANTNET_API_KEY;
    if (!API_KEY) {
        return res.status(503).json({
            error: 'Plant identification unavailable',
            detail: 'PLANTNET_API_KEY is not configured'
        });
    }

    const { image } = req.body || {};
    if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image data is required' });
    }

    try {
        // Accept data URLs or raw base64
        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        if (!base64Data) {
            return res.status(400).json({ error: 'Invalid base64 image payload' });
        }

        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 8 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image exceeds 8MB limit' });
        }

        const formData = new FormData();
        formData.append('images', buffer, { filename: 'plant.jpg', contentType: 'image/jpeg' });
        formData.append('organs', 'auto');

        const response = await axios.post(
            `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(API_KEY)}`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 25000,
                maxContentLength: 15 * 1024 * 1024,
                maxBodyLength: 15 * 1024 * 1024
            }
        );

        return res.status(200).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const detail = error.response?.data || error.message;
        console.error('PlantNet API Error:', detail);
        return res.status(status >= 400 && status < 600 ? status : 500).json({
            error: 'Failed to identify plant',
            detail: typeof detail === 'string' ? detail : undefined
        });
    }
}
