// Cloudflare Pages Function to handle dynamic company routes
export async function onRequest(context: any) {
  // Serve the static /admin/companies/1/index.html for all company IDs
  // The client-side React Router will handle the actual ID param
  const response = await context.env.ASSETS.fetch(new Request(`${new URL(context.request.url).origin}/admin/companies/1/`, context.request));

  // Clone the response to modify headers if needed
  return new Response(response.body, {
    status: 200,
    headers: response.headers
  });
}
