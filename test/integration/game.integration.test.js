// Game integration tests

const request = require('supertest');
const app = require('../../app'); // replace with your app location

describe('Game Integration Tests', () => {
    it('should create a game', async () => {
        const response = await request(app)
            .post('/games')
            .send({ name: 'Test Game', players: 2 });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
    });

    it('should get a game', async () => {
        const gameId = 1; // replace with an existing game ID
        const response = await request(app)
            .get(`/games/${gameId}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name');
    });

    // Add more tests as needed
});
