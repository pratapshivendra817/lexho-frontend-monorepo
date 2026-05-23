type BannerStatusBadgeProps = {
  active: boolean;
};
export function BannerStatusBadge({ active }: BannerStatusBadgeProps) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/20 text-zinc-300"}`}>
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}
