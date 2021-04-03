const argon2 = require('argon2');

export const getPasswordHash = (password: string) => {
    return argon2.hash(password);
}

export const verifyPassword = (passwordHash: string, password: string) => {
    return argon2.verify(passwordHash, password);
}