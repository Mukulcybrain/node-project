import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const PORT = 3002;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "data", "links.json");

// Load Links from file
const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {  // If file doesn't exist, create an empty one
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
};

// Save Links to file
const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

const server = createServer(async (req, res) => {
    console.log(req.url);

    if (req.method === 'GET') {
        try {
            if (req.url === "/") {
                const data = await readFile(path.join(__dirname, "public", "index.html"));
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            } else if (req.url === "/style.css") {
                const data = await readFile(path.join(__dirname, "public", "style.css"));
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(data);
            } else if (req.url === "/links") {
                const links = await loadLinks();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(links));
            } else {
                res.writeHead(404, { "Content-Type": "text/html" });
                res.end('404 page not found');
            }
        } catch (error) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end('500 Internal Server Error');
        }
    }

    if (req.method === 'POST' && req.url === "/shorten") {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', async () => {
            console.log(body);
            const links = await loadLinks();

            try {
                const { url, shortcode } = JSON.parse(body);

                if (!url) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end('Invalid request. Please provide a valid URL.');
                }

                const finalShortCode = shortcode || crypto.randomBytes(4).toString("hex");

                if (links[finalShortCode]) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end("Short Code already exists. Please provide a different shortcode.");
                }

                links[finalShortCode] = url;
                await saveLinks(links);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end('Error processing request');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see the home page`);
});