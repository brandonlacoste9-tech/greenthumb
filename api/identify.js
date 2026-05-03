const axios = require('axios');
const FormData = require('form-data');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { image } = req.body;
    const API_KEY = process.env.PLANTNET_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured in Vercel' });
    }

    try {
        // Pl@ntNet expects multipart form data
        const formData = new FormData();
        // Since we are sending base64 from the frontend for simplicity in this proxy
        const buffer = Buffer.from(image.split(',')[1], 'base64');
        formData.append('images', buffer, 'plant.jpg');
        formData.append('organs', 'auto');

        const response = await axios.post(
            `https://my-api.plantnet.org/v2/identify/all?api-key=${API_KEY}`,
            formData,
            { headers: formData.getHeaders() }
        );

        res.status(200).json(response.data);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to identify plant' });
    }
}
