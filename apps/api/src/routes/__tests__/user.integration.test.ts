import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../db/prisma.js';
import bcrypt from 'bcrypt';

describe('User Integration Tests - GET /me', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['usera@test.com', 'userb@test.com'],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['usera@test.com', 'userb@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test users first
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['usera@test.com', 'userb@test.com'],
        },
      },
    });

    // Setup: Create two test users and get their tokens
    const passwordHash = await bcrypt.hash('Password123', 10);

    // Create User A
    const userA = await prisma.user.create({
      data: {
        email: 'usera@test.com',
        passwordHash,
        role: 'USER',
        isActive: true,
      },
    });
    userAId = userA.id;

    // Create User B
    const userB = await prisma.user.create({
      data: {
        email: 'userb@test.com',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    userBId = userB.id;

    // Login User A
    const loginResponseA = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'usera@test.com',
        password: 'Password123',
      });

    if (loginResponseA.status !== 200) {
      console.error('Login A failed:', loginResponseA.status, loginResponseA.body);
    }

    // Extract token from cookie
    const cookiesA = loginResponseA.headers['set-cookie'] as unknown as string[] | undefined;
    const tokenCookieA = cookiesA?.find((cookie) => cookie.startsWith('auth_token='));
    userAToken = tokenCookieA?.split(';')[0].split('=')[1] || '';

    // Login User B
    const loginResponseB = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'userb@test.com',
        password: 'Password123',
      });

    if (loginResponseB.status !== 200) {
      console.error('Login B failed:', loginResponseB.status, loginResponseB.body);
    }

    // Extract token from cookie
    const cookiesB = loginResponseB.headers['set-cookie'] as unknown as string[] | undefined;
    const tokenCookieB = cookiesB?.find((cookie) => cookie.startsWith('auth_token='));
    userBToken = tokenCookieB?.split(';')[0].split('=')[1] || '';
  });

  it('should complete full flow: register → login → /me', async () => {
    // Clean up in case user exists from previous run
    await prisma.user.deleteMany({
      where: { email: 'newuser@test.com' },
    });

    // 1. Register new user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@test.com',
        password: 'Password123',
      });

    expect(registerResponse.status).toBe(201);

    // 2. Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newuser@test.com',
        password: 'Password123',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('user');
    expect(loginResponse.body.user).toHaveProperty('email', 'newuser@test.com');

    // Extract token from cookie
    const cookies = loginResponse.headers['set-cookie'] as unknown as string[] | undefined;
    const tokenCookie = cookies?.find((cookie) => cookie.startsWith('auth_token='));
    const token = tokenCookie?.split(';')[0].split('=')[1] || '';

    // 3. Call /me with token
    const meResponse = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.email).toBe('newuser@test.com');
    expect(meResponse.body).toHaveProperty('id');
    expect(meResponse.body).toHaveProperty('role');

    // Cleanup
    await prisma.user.delete({
      where: { email: 'newuser@test.com' },
    });
  });

  it('should ensure user isolation: User A cannot see User B data', async () => {
    // User A calls /me
    const userAResponse = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${userAToken}`);

    // Assert User A gets their own data
    expect(userAResponse.status).toBe(200);
    expect(userAResponse.body.id).toBe(userAId);
    expect(userAResponse.body.email).toBe('usera@test.com');
    expect(userAResponse.body.role).toBe('USER');

    // User B calls /me
    const userBResponse = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${userBToken}`);

    // Assert User B gets their own data (NOT User A's)
    expect(userBResponse.status).toBe(200);
    expect(userBResponse.body.id).toBe(userBId);
    expect(userBResponse.body.email).toBe('userb@test.com');
    expect(userBResponse.body.role).toBe('ADMIN');

    // Critical: Verify data is different
    expect(userAResponse.body.id).not.toBe(userBResponse.body.id);
    expect(userAResponse.body.email).not.toBe(userBResponse.body.email);
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 with no token', async () => {
    const response = await request(app).get('/api/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 with expired token', async () => {
    // Create a token with past expiration
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: userAId },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should return user data with subscription as null', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(response.status).toBe(200);
    expect(response.body.subscription).toBeNull();
  });

  it('should return user data with telegram.linked as false', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(response.status).toBe(200);
    expect(response.body.telegram).toEqual({ linked: false });
  });

  it('should NOT accept userId from query params (security test)', async () => {
    // Try to access User B's data by passing their ID
    const response = await request(app)
      .get(`/api/me?userId=${userBId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    // Should still return User A's data (from token), NOT User B's
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userAId);
    expect(response.body.email).toBe('usera@test.com');
    expect(response.body.id).not.toBe(userBId);
  });

  it('should NOT accept userId from request body (security test)', async () => {
    // Try to access User B's data via body
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ userId: userBId });

    // Should still return User A's data
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userAId);
    expect(response.body.id).not.toBe(userBId);
  });

  it('should work with token in cookie', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Cookie', [`auth_token=${userAToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userAId);
    expect(response.body.email).toBe('usera@test.com');
  });

  it('should include all required fields in response', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(response.status).toBe(200);

    // Required fields
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
    expect(response.body).toHaveProperty('role');
    expect(response.body).toHaveProperty('isActive');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('subscription');
    expect(response.body).toHaveProperty('telegram');

    // Should NOT include sensitive data
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password');
  });
});
