import indexHtml from "./index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": indexHtml,
  },
  development: true,
});

console.log("Server running on http://localhost:3000");
