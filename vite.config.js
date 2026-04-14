import { defineConfig } from "vite";
import plugin from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 52475,
        proxy: {
            "/api": {
                target: "http://localhost:8787",
                changeOrigin: true,
            },
        },
    },
});
