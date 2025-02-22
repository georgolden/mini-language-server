import {
  Args,
  Mutation,
  Resolver,
  Query,
  ObjectType,
  Field,
  Int,
} from '@nestjs/graphql';
import { ImageService } from './images.service.js';
import { UploadSignature } from './types.js';

@ObjectType()
class UploadSignatureType {
  @Field()
  signature: string;

  @Field(() => Int)
  timestamp: number;

  @Field()
  cloudName: string;

  @Field()
  apiKey: string;
}

@Resolver('Image')
export class ImageResolver {
  constructor(private readonly imageService: ImageService) {}

  @Mutation(() => UploadSignatureType)
  async getUploadSignature(): Promise<UploadSignature> {
    return this.imageService.getUploadSignature();
  }

  @Query(() => String)
  getAvatarUrl(@Args('id', { type: () => String }) id: string): string {
    return this.imageService.getImageUrl(id);
  }
}
