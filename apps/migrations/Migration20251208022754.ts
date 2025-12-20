import { Migration } from '@mikro-orm/migrations';

export class Migration20251208022754 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "user" ("id" varchar(255) not null, "email" varchar(255) not null, "name" varchar(255) null, "created_at" timestamptz not null, constraint "user_pkey" primary key ("id"));`,
        );
    }
}
