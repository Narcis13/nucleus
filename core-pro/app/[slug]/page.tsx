export default async function MicrositePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <div className="p-8">TODO: public micro-site for /{slug}</div>
}
