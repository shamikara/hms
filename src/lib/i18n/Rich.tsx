import { Fragment } from "react";

/** Renders a dictionary string where <b>…</b> marks bold text. No other HTML. */
export function Rich({ text, boldClassName }: { text: string; boldClassName?: string }) {
  const parts = text.split(/<b>(.*?)<\/b>/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={boldClassName}>{part}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
