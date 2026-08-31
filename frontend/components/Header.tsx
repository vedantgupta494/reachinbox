import type { CurrentUser } from "@/types";

export function Header({ user }: { user: CurrentUser | null }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-mono text-sm font-semibold text-white">
          R
        </div>
        <span className="text-sm font-semibold text-ink">ReachInbox</span>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-canvas">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted">
                {user.name.slice(0, 1)}
              </div>
            )}
          </div>
          <button className="focus-ring rounded-sm px-2 py-1 text-xs font-medium text-muted hover:text-ink">
            Log out
          </button>
        </div>
      ) : (
        <button className="focus-ring rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">
          Sign in with Google
        </button>
      )}
    </header>
  );
}
