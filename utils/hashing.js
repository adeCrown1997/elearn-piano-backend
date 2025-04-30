const { createHmac } = require('crypto');
const { hash, compare } = require('bcryptjs');

exports.doHash = async (value, saltRounds = 10) => {
  const result = await hash(value, saltRounds);
  return result;
};

exports.doHashValidation = async (value, hashedValue) => {
  const result = await compare(value, hashedValue);
  return result;
};

exports.hmacProcess = (value, key) => {
  const result = createHmac('sha256', key).update(String(value)).digest('hex');
  return result;
};