import { Module } from '@nestjs/common';
import { ImageService } from './images.service.js';
import { ImageResolver } from './images.resolver.js';

@Module({
  providers: [ImageService, ImageResolver],
  exports: [ImageService],
})
export class ImageModule {}
