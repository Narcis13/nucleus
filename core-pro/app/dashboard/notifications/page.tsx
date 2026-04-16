import { NotificationsList } from "@/components/shared/notifications/notifications-list"
import { PageHeader } from "@/components/shared/page-header"

// /dashboard/notifications
//
// Full notification history for the signed-in professional. The page is an
// RSC shell — the list itself is a client component so it can consume the
// real-time `useNotifications` hook. Loading / empty states live inside the
// list so they stay in sync with the hook's state.
export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="A running log of everything the app has pinged you about."
      />
      <NotificationsList />
    </div>
  )
}
