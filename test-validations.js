// Quick validation test script
const fs = require('fs');

// Read the validation functions
const validationCode = fs.readFileSync('./src/lib/validations/french-business.ts', 'utf8');

// Convert to runnable JS (simplified)
const jsCode = validationCode
  .replace(/export function/g, 'function')
  .replace(/: string/g, '')
  .replace(/: boolean/g, '')
  .replace(/: number/g, '');

// Execute the code
eval(jsCode);

// Test cases
console.log('Testing SIRET validation:');
console.log('Valid SIRET 73282932000074:', validateSiret('73282932000074'));
console.log('Invalid SIRET 73282932000075:', validateSiret('73282932000075'));
console.log('Empty SIRET:', validateSiret(''));
console.log('Non-numeric SIRET:', validateSiret('7328293200007A'));

console.log('\nTesting VAT rates:');
console.log('Valid rate 20%:', validateVatRate(20));
console.log('Valid rate 0%:', validateVatRate(0));
console.log('Invalid rate 19%:', validateVatRate(19));

console.log('\nTesting French dates:');
console.log('Valid date 01/01/2024:', validateFrenchDate('01/01/2024'));
console.log('Invalid date 32/01/2024:', validateFrenchDate('32/01/2024'));
console.log('Wrong format 2024-01-01:', validateFrenchDate('2024-01-01'));