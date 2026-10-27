import Link from "next/link";

type SiteHeaderVariant = "ask" | "intake" | "published";

type SiteHeaderProps = {
  variant: SiteHeaderVariant;
};

export function SiteHeader({ variant }: SiteHeaderProps) {
  const isJoinContext = variant === "intake" || variant === "published";

  return (
    <header className="site-header">
      <Link href={isJoinContext ? "/join" : "/"} className="site-header-wordmark">
        ASK HIGHER
      </Link>
      {variant === "ask" && (
        <div className="site-header-utility">
          <Link href="/join" className="site-header-utility-link">
            Join the network
          </Link>
        </div>
      )}
      {variant === "intake" && (
        <div className="site-header-utility">
          <span className="site-header-utility-label">Profile intake</span>
        </div>
      )}
      {variant === "published" && (
        <div className="site-header-utility">
          <span className="site-header-utility-label">Profile live</span>
        </div>
      )}
    </header>
  );
}
