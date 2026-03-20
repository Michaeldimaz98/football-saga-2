const request = require('supertest');
const app = require('../app');  // Adjust the path as necessary

describe('Authentication', () => {
  it('should log in with valid credentials', async () => {
    const response = await request(app)
      .post('/login')  // Adjust the endpoint as necessary
      .send({ username: 'testUser', password: 'testPassword' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should fail to log in with invalid credentials', async () => {
    const response = await request(app)
      .post('/login')  // Adjust the endpoint as necessary
      .send({ username: 'wrongUser', password: 'wrongPassword' });

    expect(response.status).toBe(401);
  });
});
