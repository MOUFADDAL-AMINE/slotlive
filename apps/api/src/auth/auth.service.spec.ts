import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtServiceMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    jwtServiceMock = {
      signAsync: vi.fn().mockResolvedValue('mocked-token'),
      verifyAsync: vi.fn(),
    };

    configServiceMock = {
      get: vi.fn((key: string, defaultValue?: string) => defaultValue || 'mock-secret'),
    };

    authService = new AuthService(
      prismaMock as any,
      jwtServiceMock as any,
      configServiceMock as any,
    );
  });

  it('should register a new user successfully', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'uuid-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'CLIENT',
      isEmailVerified: false,
      createdAt: new Date(),
    });

    const result = await authService.register({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBe('mocked-token');
    expect(result.refreshToken).toBe('mocked-token');
  });

  it('should throw ConflictException if email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
