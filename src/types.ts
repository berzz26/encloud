
/**
 * Interface for password setup result
 */
export interface PasswordSetup {
  /** The password entered by the user */
  password: string;
  /** The salt used for encryption, as a hex string */
  salt: string;
  /** The verification hash of the password */
  verificationHash: string;
}

/**
 * Interface for user data stored in Supabase
 */
export interface UserData {
  /** The user ID */
  user_id: string;
  /** The salt used for encryption, as a hex string */
  salt?: string;
  /** The verification hash of the password */
  verification_hash?: string;
}

/**
 * Interface for environment file data stored in Supabase
 */
export interface EnvFile {
  /** The user ID */
  user_id: string;
  /** The filename of the .env file */
  filename: string;
  /** The encrypted content of the .env file */
  content: string;
}

/**
 * Interface for file selection items in the quick pick menu
 */
export interface EnvFileQuickPickItem {
  /** The display label for the quick pick item */
  label: string;
  /** Additional description for the quick pick item */
  description: string;
  /** The files associated with this quick pick item */
  files: Readonly<Array<import('vscode').Uri>>;
}

/**
 * Custom error types for the extension
 */
export class PasswordRequiredError extends Error {
  constructor(message = 'Password is required') {
    super(message);
    this.name = 'PasswordRequiredError';
  }
}

export class InvalidPasswordError extends Error {
  constructor(message = 'Invalid password') {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class EncryptionError extends Error {
  constructor(message = 'Encryption failed') {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends Error {
  constructor(message = 'Decryption failed') {
    super(message);
    this.name = 'DecryptionError';
  }
}
