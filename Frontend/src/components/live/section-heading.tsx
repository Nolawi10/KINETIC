import type { ReactNode } from "react";

/** Consistent section header used across the Live Session page. */
export function SectionHeading({
  id,
  index,
  title,
  description,
  aside,
  className = "",
}: {
  id?: string;
  index: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`section-heading ${className}`}>
      <div className="section-heading-copy">
        <span className="section-heading-index">{index}</span>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {aside ? <div className="section-heading-aside">{aside}</div> : null}
    </header>
  );
}

export default SectionHeading;
