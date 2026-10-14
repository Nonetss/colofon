import type { User } from "better-auth"
import type { ReactNode } from "react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/features/admin/shell/components/app-sidebar"

interface AdminShellProps {
  nameApp: string
  currentPath: string
  user: User
  defaultOpen?: boolean
  children: ReactNode
}

export function AdminShell({
  nameApp,
  currentPath,
  user,
  defaultOpen = true,
  children,
}: AdminShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar nameApp={nameApp} currentPath={currentPath} user={user} />
      {/* `overflow-clip`, not `hidden`: a hidden box still scrolls when focus
          or scrollIntoView reaches something inside it, which slid the page
          up under its header. The page's tables and panels scroll inside
          their own boxes. */}
      <SidebarInset className="h-dvh overflow-clip">
        <header className="flex h-14 shrink-0 items-center gap-2 border-border/40 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-clip p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
