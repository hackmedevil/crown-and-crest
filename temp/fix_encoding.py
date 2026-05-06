import os

files_to_fix = [
    r'src\app\(admin)\admin\page.tsx',
    r'src\app\(admin)\admin\settings\page.tsx',
    r'src\app\(auth)\auth\forgot-password\ForgotPasswordClient.tsx',
    r'src\app\(auth)\auth\steps\EmailStep.tsx',
    r'src\app\(auth)\auth\steps\EnterStep.tsx',
    r'src\app\(storefront)\cart\CartClient.tsx',
    r'src\app\(storefront)\order\failure\OrderFailureClient.tsx',
    r'src\components\admin\products\ProductForm.tsx',
    r'src\components\ErrorBoundary.tsx',
    r'src\components\PhoneVerificationModal.tsx',
]

for file_path in files_to_fix:
    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove BOM and fix HTML entities
        content = content.replace('\ufeff', '')
        content = content.replace('&apos;', "'")
        content = content.replace('&quot;', '"')
        content = content.replace('&amp;', '&')
        
        # Write back
        with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
            f.write(content)
        
        print(f"Fixed: {file_path}")
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")

print("\nAll files processed!")
