import sys
from PIL import Image

in_path = "/Users/mokesh/.gemini/antigravity/brain/b1c3b91f-2b85-40b4-a9bf-16b65ca188dd/media__1785345231949.jpg"
out_dir = "/Users/mokesh/Documents/mri-workstation/public"

try:
    img = Image.open(in_path).convert("RGBA")
    
    # Save the full image for the landing page
    img.save(f"{out_dir}/logo-full.png")
    
    # Generate all requested sizes (uncropped, as requested)
    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "android-chrome-192x192.png": 192,
        "android-chrome-512x512.png": 512,
        "mstile-150x150.png": 150
    }
    
    for name, size in sizes.items():
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(f"{out_dir}/{name}")
        
    # Generate favicon.ico (includes 16, 32, 48, 64)
    ico_img = img.resize((64, 64), Image.Resampling.LANCZOS)
    ico_img.save(f"{out_dir}/favicon.ico", format="ICO", sizes=[(16,16), (32,32), (48,48), (64,64)])
    
    # Generate the cropped icon specifically for the navbar
    # The image is 1024x1024. The icon is roughly in the top 60%
    # We will crop it: left 200, top 100, right 824, bottom 600
    icon_only = img.crop((200, 100, 824, 650))
    icon_only.save(f"{out_dir}/logo-icon.png")
    print("Success")
except Exception as e:
    print(f"Error: {e}")
