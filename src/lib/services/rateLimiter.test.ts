import { RateLimiter } from './rateLimiter';

const limiter = new RateLimiter();
const key = 'test';
const limit = 3;
const windowMs = 1000;

console.log('1. Checking limit (should be true):', limiter.checkLimit(key, limit, windowMs));
console.log('2. Checking limit (should be true):', limiter.checkLimit(key, limit, windowMs));
console.log('3. Checking limit (should be true):', limiter.checkLimit(key, limit, windowMs));
console.log('4. Checking limit (should be false):', limiter.checkLimit(key, limit, windowMs));

setTimeout(() => {
    console.log('5. Checking limit after 1.1s (should be true):', limiter.checkLimit(key, limit, windowMs));
    process.exit(0);
}, 1100);
