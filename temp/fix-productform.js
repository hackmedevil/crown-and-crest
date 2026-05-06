const fs = require('fs');

const filePath = 'src\\components\\admin\\products\\ProductForm.tsx';

try {
  // Read file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove BOM
  content = content.replace(/^\uFEFF/, '');
  
  // Fix spaced HTML entities (like: from & apos; react & apos;)
  content = content.replace(/\s*&\s*apos;\s*/g, "'");
  content = content.replace(/\s*&\s*quot;\s*/g, '"');
  content = content.replace(/\s*&\s*amp;\s*/g, '&');
  
  // Fix normal HTML entities
  content = content.replace(/&apos;/g, "'");
  content = content.replace(/&quot;/g, '"');
  content = content.replace(/&amp;/g, '&');
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`Fixed: ${filePath}`);
} catch (error) {
  console.error(`Error fixing ${filePath}:`, error.message);
}
