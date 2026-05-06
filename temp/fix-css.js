const fs = require('fs');

const filePath = 'src/components/admin/products/ProductForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix spaced CSS classes
content = content.replace(/className="([^"]*)"/g, (match, classes) => {
  // Remove spaces around hyphens and slashes in Tailwind classes
  const fixed = classes
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+\/\s+/g, '/')
    .replace(/hover:\s+/g, 'hover:')
    .replace(/focus:\s+/g, 'focus:')
    .replace(/group-hover:\s+/g, 'group-hover:')
    .replace(/active:\s+/g, 'active:')
    .replace(/disabled:\s+/g, 'disabled:')
    .replace(/(\d+)\s+-\s+/g, '$1-')
    .replace(/\s+-\s+(\d+)/g, '-$1');
  return `className="${fixed}"`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed CSS classes in ProductForm.tsx');
