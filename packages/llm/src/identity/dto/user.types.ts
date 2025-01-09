import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';

registerEnumType(Role, {
  name: 'Role',
});

@ObjectType()
export class User {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  email?: string;

  @Field()
  name: string;

  @Field()
  permalink: string;

  @Field()
  active: boolean;

  @Field({ nullable: true })
  githubId?: string;

  @Field({ nullable: true })
  googleId?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => Role)
  role: Role;

  @Field()
  createdAt: Date;
}
