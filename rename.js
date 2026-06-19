const fs = require('fs');
const files = ['admin.html', 'app.js', 'inbox.html', 'index.html', 'README.md', 'send.html', 'settings.html', 'style.css', 'translations.js', 'firebase-config.js'];
files.forEach(file => {
  const path = 'c:/Users/User/Documents/ngl/' + file;
  let content = fs.readFileSync(path, 'utf8');
  // Replace Whispr with WhisprMask, ensuring we don't replace WhisprMaskMask
  content = content.replace(/Whispr(?!Mask)/g, 'WhisprMask');
  fs.writeFileSync(path, content, 'utf8');
});
console.log('Renamed successfully!');
