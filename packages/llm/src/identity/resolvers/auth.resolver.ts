import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from '../services/auth.service.js';
import { SocialAuthInput } from '../dto/auth.input.js';
import { User } from '../dto/user.types.js';
import { Context as RequestContext } from '../types/context.types.js';

@Resolver(() => User)
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Query(() => String)
  getGoogleAuthURL() {
    return this.authService.getGoogleAuthURL();
  }

  @Query(() => User)
  async googleAuth(
    @Args('input') input: SocialAuthInput,
    @Context() context: RequestContext,
  ) {
    return this.authService.googleAuth(input, context);
  }

  @Query(() => User)
  async githubAuth(
    @Args('input') input: SocialAuthInput,
    @Context() context: RequestContext,
  ) {
    return this.authService.githubAuth(input, context);
  }

  @Mutation(() => User)
  async signIn(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context() context: RequestContext,
  ) {
    return this.authService.localAuth(email, password, context);
  }

  @Mutation(() => User)
  async signUp(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('name') name: string,
  ) {
    return this.authService.register({ email, password, name });
  }

  @Mutation(() => Boolean)
  async logout(@Context() context: RequestContext) {
    await this.authService.logout(context);
    return true;
  }
}
