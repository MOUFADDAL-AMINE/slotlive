import { apiEnvSchema, type ApiEnv } from '@slotlive/shared';

export function validateEnv(): ApiEnv {
  const result = apiEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(`\n\u274c Invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}
