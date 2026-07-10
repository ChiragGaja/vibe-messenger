const request = require('supertest');
const app = require('../index');

describe('Health Check Endpoint', () => {
    it('should return 200 OK and status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('should handle 404 for unknown API routes', async () => {
        const res = await request(app).get('/api/unknown-route');
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('error', 'API Route not found');
    });
});
