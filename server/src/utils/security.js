const argon2 = require('argon2');

exports.getPasswordHash = (password) => {
    return argon2.hash(password);
}

exports.verifyPassword = (passwordHash, password) => {
    return argon2.verify(passwordHash, password);
}