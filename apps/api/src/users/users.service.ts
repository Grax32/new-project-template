import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly repo: EntityRepository<User>) {}

    async create(dto: Partial<User>) {
        const u = this.repo.create(dto as User);
        await this.repo.getEntityManager().persistAndFlush(u);
        return u;
    }

    findAll() {
        return this.repo.findAll();
    }
}
