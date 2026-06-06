export default function LogoSliderBlock({ settings = {}, assets = [] }) {
  const activeAssets = assets.filter((a) => a?.image_url && a?.is_active !== false);
  if (!activeAssets.length) return null;

  const { title, subtitle } = settings;

  return (
    <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm">
      {title ? (
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {title}
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activeAssets.map((asset) => {
          const fit = ["client_logo", "brand_mark"].includes(asset.asset_type)
            ? "object-contain"
            : "object-cover";
          const content = (
            <div className="flex min-h-[90px] items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img
                  src={asset.image_url}
                  alt={asset.alt_text || asset.company_name || asset.title || "Cliente"}
                  className={`h-full w-full ${fit}`}
                  loading="lazy"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-950">
                  {asset.company_name || asset.title || "Cliente"}
                </div>
                {asset.title && asset.company_name ? (
                  <div className="mt-1 text-xs text-neutral-500">{asset.title}</div>
                ) : null}
              </div>
            </div>
          );
          return asset.website_url ? (
            <a key={asset.id || asset.image_url} href={asset.website_url} target="_blank" rel="noreferrer" className="block">
              {content}
            </a>
          ) : (
            <div key={asset.id || asset.image_url}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
