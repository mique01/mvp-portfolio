export default {
  async fetch(request) {
    try {
      const serverModule = await import("../dist/server/server.js");
      return serverModule.default.fetch(request);
    } catch (error) {
      console.error("[api/server] failed to load TanStack server bundle", error);
      return Response.json(
        {
          status: 500,
          unhandled: true,
          message: error instanceof Error ? error.message : "Server bootstrap failed",
        },
        { status: 500 },
      );
    }
  },
};
