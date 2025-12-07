import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity()
export class User {
  @PrimaryKey()
  id: string = v4();

  @Property()
  email!: string;

  @Property({ nullable: true })
  name?: string;

  @Property({ onCreate: () => new Date() })
  createdAt = new Date();
}
