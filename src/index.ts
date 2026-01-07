import dotenv from 'dotenv';
dotenv.config();

console.log('🤖 Rejimde Bot System');
console.log('====================');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`API URL: ${process.env. REJIMDE_API_URL}`);
console.log('');
console.log('Available commands:');
console.log('  npm run create-bots  - Create bot users');
console.log('  npm run run-daily    - Run daily activities');
console.log('  npm run toggle-bots  - Enable/disable bots');
console.log('  npm run test-api     - Test API connection');