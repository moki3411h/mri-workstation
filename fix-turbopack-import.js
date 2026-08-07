const fs = require('fs');

const path = './src/app/LandingPageContent.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Replace standard ES imports of gsap with require statements 
// or simply try renaming the import so it avoids the TDZ hoisting issue Next.js compiler sometimes has
content = content.replace(/import gsap from 'gsap';\nimport { ScrollTrigger } from 'gsap\/ScrollTrigger';/g, 
  "import { gsap } from 'gsap';\nimport { ScrollTrigger } from 'gsap/ScrollTrigger';");

fs.writeFileSync(path, content);
