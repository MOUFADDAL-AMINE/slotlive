import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: 'CLIENT' | 'ADMIN';
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const rawUser = request.user;
    if (!rawUser) return null;
    const user: CurrentUserPayload = {
      userId: rawUser.userId || rawUser.sub,
      email: rawUser.email,
      role: rawUser.role,
    };
    return data ? user?.[data] : user;
  },
);
