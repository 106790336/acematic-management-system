#!/usr/bin/env python3
import zipfile, os, shutil

os.chdir('/home/ubuntu')
FRONTEND_TARGET = '/home/ubuntu/acematic/frontend/dist'
BACKEND_TARGET = '/home/ubuntu/acematic/backend-src'

def fix_extract(zip_path, target_dir, prefix_to_strip):
    if not os.path.exists(zip_path):
        print(f'{zip_path} not found')
        return
    with zipfile.ZipFile(zip_path, 'r') as z:
        for name in z.namelist():
            # Fix Windows backslashes -> forward slashes
            fixed = name.replace('\\', '/')
            if not fixed.startswith(prefix_to_strip):
                continue
            relative = fixed[len(prefix_to_strip):].lstrip('/')
            out_path = os.path.join(target_dir, relative)
            out_dir = os.path.dirname(out_path)
            if not os.path.exists(out_dir):
                os.makedirs(out_dir, exist_ok=True)
            if not name.endswith('/'):
                with z.open(name) as src, open(out_path, 'wb') as dst:
                    dst.write(src.read())
    os.remove(zip_path)
    print(f'{zip_path} extracted to {target_dir}')

# Extract frontend (zip contains: frontend/dist/...)
fix_extract('frontend-pkg.zip', FRONTEND_TARGET, 'frontend/dist/')

# Extract backend (zip contains: backend/...)
fix_extract('backend-pkg.zip', BACKEND_TARGET, 'backend/')

print('All extracted.')
