import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const UserOrMeParam = createParamDecorator(
  (paramName: string, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const idParam = request.params?.[paramName];
    const userId = request.user?.id;

    // Allow "me" or exact user id, else throw
    if (idParam === 'me') {
      return userId;
    }

    if (request.user?.role !== 'admin' && idParam !== userId) {
      throw new ForbiddenException('You can only access your own data');
    }

    return idParam;
  },
);
