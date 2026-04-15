export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh">
      {/* TODO: portal chrome — branded with professional's colors/logo */}
      {children}
    </div>
  )
}
