const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src\\app\\(admin)\\admin\\page.tsx',
  'src\\app\\(admin)\\admin\\settings\\page.tsx',
  'src\\app\\(auth)\\auth\\forgot-password\\ForgotPasswordClient.tsx',
  'src\\app\\(auth)\\auth\\steps\\EmailStep.tsx',
  'src\\app\\(auth)\\auth\\steps\\EnterStep.tsx',
  'src\\app\\(storefront)\\cart\\CartClient.tsx',
  'src\\app\\(storefront)\\order\\failure\\OrderFailureClient.tsx',
  'src\\components\\admin\\products\\ProductForm.tsx',
  'src\\components\\ErrorBoundary.tsx',
  'src\\components\\PhoneVerificationModal.tsx'
];

filesToFix.forEach(filePath => {
  try {
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove BOM and fix HTML entities
    content = content.replace(/^\uFEFF/, '');
    content = content.replace(/&apos;/g, "'");
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&amp;/g, '&');
    
    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
});

console.log('\nAll files processed!');
