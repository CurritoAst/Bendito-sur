const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Extraer sólo el body
const bodyMatch = html.match(/<body>([\s\S]*?)<script/);
if (!bodyMatch) {
    console.error("No se pudo extraer el body");
    process.exit(1);
}

let jsxContent = bodyMatch[1];

// 1. replace class= with className=
jsxContent = jsxContent.replace(/class=/g, 'className=');

// 2. replace for= with htmlFor=
jsxContent = jsxContent.replace(/for=/g, 'htmlFor=');

// 3. Close specific unclosed tags: input, img, br, hr
jsxContent = jsxContent.replace(/<(input|img|br|hr)([^>]*?)(?!\/)> /g, '<$1$2 /> ');
jsxContent = jsxContent.replace(/<(input|img|br|hr)([^>]*?)(?!\/)>$/gm, '<$1$2 />');
jsxContent = jsxContent.replace(/<(input|img|br|hr)([^>]*?)(?!\/)\s*>/g, '<$1$2 />');

// 4. Convert inline styles: style="prop: value; prop2: value2;"
// This is basic and might miss some edge cases, but covers the most common ones.
jsxContent = jsxContent.replace(/style="([^"]*)"/g, (match, styles) => {
    const styleObj = styles.split(';').reduce((acc, current) => {
        const parts = current.split(':');
        if (parts.length === 2) {
            const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            let value = parts[1].trim();
            // preserve strings properly
            acc.push(`"${key}": "${value}"`);
        }
        return acc;
    }, []);
    return `style={{ ${styleObj.join(', ')} }}`;
});

// Remove regular comments to avoid JSX commenting issues
jsxContent = jsxContent.replace(/<!--[\s\S]*?-->/g, '');

const finalJsx = `
import React, { useEffect } from 'react';
import './index.css';
import { initializeAppLogic } from './legacyApp.js';

export default function App() {
    useEffect(() => {
        // Ejecutar lógica antigua sobre el DOM una vez montado
        initializeAppLogic();
    }, []);

    return (
        <>
            ${jsxContent}
        </>
    );
}
`;

if (!fs.existsSync('src')) {
    fs.mkdirSync('src');
}
fs.writeFileSync('src/App.jsx', finalJsx);

// Update index.html to Vite React format
const newIndexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bendito Sur (Vite + React)</title>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div id="root"></div>
    <script src="/config.js"></script>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;

fs.writeFileSync('index.html', newIndexHtml);

// Escribir main.jsx
const mainJsx = `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
fs.writeFileSync('src/main.jsx', mainJsx);
