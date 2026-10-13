import type { ProductProfile } from "@/data/product-profiles";

/** Client-supplied spec tables for a vial product page. Server component. */
export default function ProductProfileSection({ profile }: { profile: ProductProfile }) {
  return (
    <section className="section-pad !pb-0">
      {profile.intro?.map((para, i) => (
        <p key={i} className="mb-4 text-[16px] leading-relaxed text-muted">
          {para}
        </p>
      ))}
      {profile.tags?.length ? (
        <ul className="mb-6 flex flex-wrap gap-2">
          {profile.tags.map((t) => (
            <li
              key={t}
              className="rounded-full border border-line-soft bg-surface px-3 py-1 text-[12.5px] font-semibold text-teal-dark"
            >
              {t}
            </li>
          ))}
        </ul>
      ) : null}
      {profile.tables.map((tb, i) => (
        <div key={tb.title + i} className={i > 0 ? "mt-8" : undefined}>
          <h2 className="t-display-md">{tb.title}</h2>
          {tb.note && <p className="mt-2 text-[15px] text-muted">{tb.note}</p>}
          <div className="mt-4 overflow-x-auto rounded-sm border border-line-soft">
            <table className="w-full min-w-[320px] border-collapse text-left text-[14.5px]">
              <thead>
                <tr className="bg-surface-2">
                  <th scope="col" className="w-[38%] px-4 py-2.5 font-semibold">
                    {tb.head[0]}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    {tb.head[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map(([k, v]) => (
                  <tr key={k} className="border-t border-line-soft align-top">
                    <th scope="row" className="px-4 py-2.5 font-semibold text-ink">
                      {k}
                    </th>
                    <td className="break-words px-4 py-2.5 font-mono text-[13.5px] text-muted">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
