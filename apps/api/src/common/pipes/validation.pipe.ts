import { Injectable, PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints || {}),
      );
      throw new BadRequestException({
        message: messages,
        error: 'Validation Error',
        statusCode: 400,
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: Array<new (...args: unknown[]) => unknown> = [
      String as unknown as new (...args: unknown[]) => unknown,
      Boolean as unknown as new (...args: unknown[]) => unknown,
      Number as unknown as new (...args: unknown[]) => unknown,
      Array as unknown as new (...args: unknown[]) => unknown,
      Object as unknown as new (...args: unknown[]) => unknown,
    ];
    return !types.includes(metatype);
  }
}
