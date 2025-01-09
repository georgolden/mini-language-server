import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OAuthService } from '../src/identity/services/oauth.service';

describe('Identity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueEmail = `test${Date.now()}@example.com`;
  const uniquePermalink = `test-user-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OAuthService)
      .useValue({
        getGitHubUser: jest.fn().mockResolvedValue({
          id: Date.now(),
          name: 'Test GitHub User',
          login: uniquePermalink,
          email: `github${Date.now()}@example.com`,
          avatar_url: 'http://github.com/avatar.jpg',
        }),
        getGoogleUser: jest.fn().mockResolvedValue({
          id: Date.now().toString(),
          name: 'Test Google User',
          email: `google${Date.now()}@example.com`,
          picture: 'http://google.com/picture.jpg',
          verified_email: true,
          given_name: 'Test',
          family_name: 'User',
          locale: 'en',
        }),
        getGoogleAuthURL: jest.fn().mockReturnValue('http://mock-google-url'),
      })
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  const registerMutation = `
    mutation SignUp($email: String!, $password: String!, $name: String!) {
      signUp(email: $email, password: $password, name: $name) {
        id
        email
        name
        role
      }
    }
  `;

  describe('Registration', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            email: uniqueEmail,
            password: 'password123',
            name: 'Test User',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.signUp).toMatchObject({
            email: uniqueEmail,
            name: 'Test User',
            role: 'USER',
          });
        });
    });
  });

  describe('OAuth Authentication', () => {
    it('should authenticate with Google', () => {
      const googleAuthQuery = `
        query GoogleAuth($code: String!) {
          googleAuth(input: { code: $code }) {
            id
            email
            name
            googleId
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: googleAuthQuery,
          variables: { code: 'google_mock_code' },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.googleAuth).toBeDefined();
          expect(res.body.data.googleAuth.googleId).toBeDefined();
        });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle full registration and login flow', async () => {
      const testEmail = `flow${Date.now()}@example.com`;

      const registerResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            email: testEmail,
            password: 'password123',
            name: 'Flow User',
          },
        });

      expect(registerResponse.body.data.signUp).toBeDefined();

      const loginMutation = `
        mutation SignIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            id
            email
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            email: testEmail,
            password: 'password123',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.signIn).toBeDefined();
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });
  });
});
