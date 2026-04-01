// Simple static-asset passthrough Worker.
// All report submissions go directly to MongoDB Atlas Data API from the browser.
// This Worker just serves the static files (index.html, CSS, JS, images).

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
