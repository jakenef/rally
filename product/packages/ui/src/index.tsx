// crimsonhacks components, ported to TypeScript from brand-assets/crimsonhacks/components/bundle.js.
// Class names and markup match the original, so components.css styles them unchanged.
// Shared file: tell the other lane before changing it.
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------- Icon ----------

export type IconName = "paddle" | "ball" | "court" | "arrow" | "bag" | "trophy";

const dot = (x: number, y: number) => <circle cx={x} cy={y} r={1.2} fill="currentColor" stroke="none" />;
const ICONS: Record<IconName, ReactNode> = {
  paddle: (
    <>
      <rect x={5} y={2} width={14} height={15} rx={6} />
      <path d="M10.5 17v5h3v-5" />
    </>
  ),
  ball: (
    <>
      <circle cx={12} cy={12} r={9} />
      {dot(12, 12)}
      {dot(12, 7)}
      {dot(16.4, 10.4)}
      {dot(14.7, 15.6)}
      {dot(9.3, 15.6)}
      {dot(7.6, 10.4)}
    </>
  ),
  court: (
    <>
      <rect x={2.5} y={5} width={19} height={14} rx={1} />
      <path d="M12 5v14M9 5v14M15 5v14M2.5 12H9M15 12h6.5" />
    </>
  ),
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
  bag: (
    <>
      <path d="M5.5 8h13l-1.2 12H6.7L5.5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8.5 20h7M10 17h4" />,
};

export function Icon({ name, size = 24, title, className }: { name: IconName; size?: number; title?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("ch-icon", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name]}
    </svg>
  );
}

// ---------- Wordmark ----------

/** The stacked serif-over-sans mark. Defaults to crimsonhacks; Rally passes its own words. */
export function Wordmark({
  serif = "Crimson",
  sans = "Hacks",
  size = "md",
  className,
}: {
  serif?: string;
  sans?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cx("ch-wordmark", `ch-wordmark-${size}`, className)} role="img" aria-label={[serif, sans].filter(Boolean).join(" ")}>
      <span className="ch-wm-serif" aria-hidden="true">
        {serif}
      </span>
      {sans ? (
        <span className="ch-wm-sans" aria-hidden="true">
          {sans}
        </span>
      ) : null}
    </span>
  );
}

// ---------- Button ----------

type ButtonBase = { variant?: "primary" | "light" | "outline"; icon?: IconName; iconAfter?: IconName; children: ReactNode; className?: string };
export type ButtonProps =
  | (ButtonBase & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">)
  | (ButtonBase & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">);

/** 48px uppercase action. Primary once per view. Start the label with a verb. */
export function Button(props: ButtonProps) {
  const { variant = "primary", icon, iconAfter, children, className, ...rest } = props;
  const inner = (
    <>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
      {iconAfter ? <Icon name={iconAfter} /> : null}
    </>
  );
  const cls = cx("ch-btn", `ch-btn-${variant}`, className);
  if ("href" in rest && rest.href !== undefined) {
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={cls}>
      {inner}
    </button>
  );
}

// ---------- Headline ----------

export type HeadlinePart = string | { text: string; serif: true };

/** Uppercase sans headline. Swap one to three words into the serif with `parts`. */
export function Headline({
  size = "h2",
  as,
  align,
  parts,
  children,
  className,
}: {
  size?: "impact" | "h1" | "h2" | "h3";
  as?: "h1" | "h2" | "h3" | "p" | "div";
  align?: "start" | "center";
  parts?: HeadlinePart[];
  children?: ReactNode;
  className?: string;
}) {
  const Tag = as ?? (size === "h1" ? "h1" : "h2");
  const body = parts
    ? parts.flatMap((part, i) => [
        i ? " " : null,
        typeof part === "string" ? (
          part
        ) : (
          <span key={i} className="ch-hl-serif">
            {part.text}
          </span>
        ),
      ])
    : children;
  return <Tag className={cx("ch-hl", `ch-hl-${size}`, align === "center" && "ch-hl-center", className)}>{body}</Tag>;
}

// ---------- Caption ----------

/** Crimson tag bar with an uppercase caption. Write captions as PLACE, YEAR. */
export function Caption({ children, bar = true, className }: { children?: ReactNode; bar?: boolean; className?: string }) {
  return (
    <div className={cx("ch-caption", className)}>
      {bar ? <span className="ch-tagbar" aria-hidden="true" /> : null}
      {children ? <span className="ch-caption-text">{children}</span> : null}
    </div>
  );
}

// ---------- Marquee ----------

/** The one moving piece per page. Stops under prefers-reduced-motion. */
export function Marquee({ rows, speed = 40, className }: { rows: { text: string; serif?: boolean }[]; speed?: number; className?: string }) {
  return (
    <div
      className={cx("ch-marquee", className)}
      style={{ "--ch-mq-speed": `${speed}s` } as CSSProperties}
      role="text"
      aria-label={rows.map((r) => r.text).join(". ")}
    >
      {rows.map((r, i) => (
        <div key={i} aria-hidden="true" className={cx("ch-mq-row", r.serif ? "ch-mq-serif" : "ch-mq-sans", i % 2 === 1 && "ch-mq-rev")}>
          {[0, 1, 2, 3].map((k) => (
            <span key={k}>{r.text}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- EventCard ----------

/** Notched card announcing the next session. One per page. */
export function EventCard({
  label = "Next match",
  title,
  meta = [],
  icon = "paddle",
  metaIcon = "trophy",
  className,
}: {
  label?: string;
  title: string;
  meta?: string | string[];
  icon?: IconName;
  metaIcon?: IconName;
  className?: string;
}) {
  const lines = ([] as string[]).concat(meta);
  return (
    <div className={cx("ch-event", className)}>
      <span className="ch-event-label">{label}</span>
      <div className="ch-event-frame">
        <div className="ch-event-body">
          <Icon name={icon} />
          <span className="ch-event-title">{title}</span>
          <span className="ch-event-rule" aria-hidden="true" />
          <Icon name={metaIcon} size={22} />
          <span className="ch-event-meta">
            {lines.map((m, i) => (
              <span key={i}>
                {i ? <br /> : null}
                {m}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- Perforation ----------

/** The ball-hole texture, for full-width sections only. `tone="night"` makes a night section. */
export function Perforation({
  tone = "surface",
  pitch,
  as: Tag = "div",
  style,
  className,
  children,
}: {
  tone?: "surface" | "night";
  pitch?: number;
  as?: "div" | "section" | "header" | "footer";
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}) {
  const s = { ...style, ...(pitch ? { "--ch-perf-pitch": `${pitch}px` } : null) } as CSSProperties;
  return (
    <Tag className={cx("ch-perf", tone === "night" && "ch-night", className)} style={s}>
      {children}
    </Tag>
  );
}
