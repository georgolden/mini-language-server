import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SocialAuthInput {
  @Field()
  code: string;
}
