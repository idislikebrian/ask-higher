import Link from "next/link";

type SiteHeaderVariant = "ask" | "intake" | "published";

type SiteHeaderProps = {
  variant: SiteHeaderVariant;
};

export function SiteHeader({ variant }: SiteHeaderProps) {
  const isJoinContext = variant === "intake" || variant === "published";

  return (
    <header className="site-header">
      <Link href={isJoinContext ? "/join" : "/"} className="text-sm font-bold tracking-[-0.02em]">
        ASK HIGHER
      </Link>
      {variant === "ask" && (
        <Link href="/join" className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Join the network
        </Link>
      )}
      {variant === "intake" && <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Profile intake</span>}
    </header>
  );
}
