import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

export function zodResolver<T extends FieldValues>(schema: z.ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key !== 'string' || errors[key]) continue;
      Object.assign(errors, {
        [key]: { type: issue.code, message: issue.message },
      });
    }

    return { values: {}, errors };
  };
}
