import { Injectable } from "@nestjs/common";
import type { Prisma } from "@batool/database";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data: input });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
