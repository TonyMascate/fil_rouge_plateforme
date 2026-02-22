import { SetMetadata } from '@nestjs/common';

export const SkipCsrf = () => SetMetadata('skipCsrf', true);
