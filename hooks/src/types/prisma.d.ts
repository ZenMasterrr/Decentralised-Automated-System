import { Prisma } from '@prisma/client';

declare module '@prisma/client' {
  interface User {
    metadata: Prisma.JsonValue | null;
  }

  namespace Prisma {
    interface UserCreateInput {
      metadata?: Prisma.InputJsonValue | null;
    }

    interface UserUpdateInput {
      metadata?: Prisma.InputJsonValue | null;
    }
  }
}
