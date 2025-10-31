if (!process.env.CONVEX_SITE_URL) {
  throw new Error("CONVEX_SITE_URL environment variable is required");
}

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
