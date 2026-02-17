'use strict';

const crypto = require('crypto');

const SECRET_KEY = process.env.AES_SECRET_KEY || 'defaultsecretkey'; // must be 16 bytes for aes-128
const IV        = process.env.AES_IV         || 'defaultivvalue16'; // must be 16 bytes

/**
 * Encrypt a plain-text string using AES-128-CBC (matches PHP openssl_encrypt with 'aes128').
 */
function encrypt(plainText) {
  const key = Buffer.alloc(16);
  Buffer.from(SECRET_KEY).copy(key);

  const iv = Buffer.alloc(16);
  Buffer.from(IV).copy(iv);

  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * Decrypt a base64-encoded AES-128-CBC cipher text.
 */
function decrypt(cipherText) {
  if (!cipherText) return '';
  const key = Buffer.alloc(16);
  Buffer.from(SECRET_KEY).copy(key);

  const iv = Buffer.alloc(16);
  Buffer.from(IV).copy(iv);

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  let decrypted = decipher.update(cipherText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
