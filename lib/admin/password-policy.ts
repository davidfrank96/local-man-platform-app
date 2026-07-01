export type AdminPasswordPolicyConfig = {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  blockCommonPasswords: boolean;
};

export type AdminPasswordValidationResult =
  | {
    success: true;
  }
  | {
    success: false;
    issues: string[];
  };

const defaultPolicy: AdminPasswordPolicyConfig = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  blockCommonPasswords: true,
};

const commonWeakPasswords = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "admin123",
  "admin1234",
  "localman123",
  "qwerty123",
  "letmein123",
  "changeme123",
]);

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const normalized = process.env[name]?.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

function readMinLengthEnv(): number {
  const parsed = Number.parseInt(process.env.ADMIN_PASSWORD_MIN_LENGTH ?? "", 10);

  return Number.isFinite(parsed) && parsed >= 8 ? parsed : defaultPolicy.minLength;
}

export function getAdminPasswordPolicyConfig(): AdminPasswordPolicyConfig {
  return {
    minLength: readMinLengthEnv(),
    requireUppercase: readBooleanEnv(
      "ADMIN_PASSWORD_REQUIRE_UPPERCASE",
      defaultPolicy.requireUppercase,
    ),
    requireLowercase: readBooleanEnv(
      "ADMIN_PASSWORD_REQUIRE_LOWERCASE",
      defaultPolicy.requireLowercase,
    ),
    requireNumber: readBooleanEnv(
      "ADMIN_PASSWORD_REQUIRE_NUMBER",
      defaultPolicy.requireNumber,
    ),
    requireSpecial: readBooleanEnv(
      "ADMIN_PASSWORD_REQUIRE_SPECIAL",
      defaultPolicy.requireSpecial,
    ),
    blockCommonPasswords: readBooleanEnv(
      "ADMIN_PASSWORD_BLOCK_COMMON",
      defaultPolicy.blockCommonPasswords,
    ),
  };
}

export function validateAdminPassword(
  password: string,
  policy: AdminPasswordPolicyConfig = getAdminPasswordPolicyConfig(),
): AdminPasswordValidationResult {
  const issues: string[] = [];
  const trimmed = password.trim();

  if (password.length < policy.minLength) {
    issues.push(`Use at least ${policy.minLength} characters.`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    issues.push("Add at least one uppercase letter.");
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    issues.push("Add at least one lowercase letter.");
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    issues.push("Add at least one number.");
  }

  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    issues.push("Add at least one special character.");
  }

  if (policy.blockCommonPasswords && commonWeakPasswords.has(trimmed.toLowerCase())) {
    issues.push("Choose a less common password.");
  }

  if (issues.length > 0) {
    return {
      success: false,
      issues,
    };
  }

  return {
    success: true,
  };
}

export function describeAdminPasswordPolicy(
  policy: AdminPasswordPolicyConfig = getAdminPasswordPolicyConfig(),
): string {
  const requirements = [`${policy.minLength}+ characters`];

  if (policy.requireUppercase) requirements.push("uppercase");
  if (policy.requireLowercase) requirements.push("lowercase");
  if (policy.requireNumber) requirements.push("number");
  if (policy.requireSpecial) requirements.push("special character");

  return requirements.join(", ");
}
