import TraderDetail from './TraderDetail';

export async function generateStaticParams() {
  // Generate a placeholder param for static build
  // Actual routing will be handled by Cloudflare Pages with _routes.json
  return [{ id: '1' }];
}

export default function TraderDetailPage() {
  return <TraderDetail />;
}
