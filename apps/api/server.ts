import {createServer} from "node:http";
import {watch} from "node:fs";
import {readFile} from "node:fs/promises";
import {extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const editorRoot = join(root, "starter");
const liveReloadClients = new Set();

watch(editorRoot, {persistent: false}, (_event, filename) => {
    if (!filename || (!filename.endsWith(".js") && !filename.endsWith(".css") && !filename.endsWith(".html"))) return;
    for (const response of liveReloadClients) {
        response.write(`data: ${JSON.stringify({file: filename, changedAt: Date.now()})}\n\n`);
    }
});

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, "http://127.0.0.1");

        if (request.method === "GET" && url.pathname === "/api/events") {
            response.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive"
            });
            response.write("event: ready\ndata: {}\n\n");
            liveReloadClients.add(response);
            request.on("close", () => liveReloadClients.delete(response));
            return;
        }

        await serveEditor(response, url.pathname);
    } catch (error) {
        response.writeHead(500, {"Content-Type": "text/plain; charset=utf-8"});
        response.end(error.message || "Ошибка сервера");
    }
});

const preferredPort = Number(process.env.PORT || 3000);
await listenWithFallback(server, preferredPort, !process.env.PORT);

async function serveEditor(response, pathname) {
    const route = pathname === "/" ? "/index.html" : pathname;
    const normalized = normalize(route).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(editorRoot, normalized);

    if (!filePath.startsWith(editorRoot)) {
        response.writeHead(403);
        response.end("Запрещенный путь");
        return;
    }

    try {
        const data = await readFile(filePath);
        response.writeHead(200, {"Content-Type": contentType(filePath)});
        response.end(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
            response.end("Страница не найдена");
            return;
        }
        throw error;
    }
}

function contentType(filePath) {
    const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8"
    };
    return types[extname(filePath)] || "application/octet-stream";
}

function listenWithFallback(httpServer, port, allowFallback) {
    return new Promise((resolve, reject) => {
        const tryListen = (candidatePort) => {
            const onError = (error) => {
                httpServer.off("listening", onListening);
                if (error.code === "EADDRINUSE" && allowFallback && candidatePort < port + 20) {
                    tryListen(candidatePort + 1);
                    return;
                }
                reject(error);
            };
            const onListening = () => {
                httpServer.off("error", onError);
                console.log(`PixelLab Paint: http://127.0.0.1:${candidatePort}`);
                resolve(candidatePort);
            };
            httpServer.once("error", onError);
            httpServer.once("listening", onListening);
            httpServer.listen(candidatePort, "127.0.0.1");
        };
        tryListen(port);
    });
}
