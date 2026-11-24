import type { ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { formatDateTime } from "../lib/period";

/** "24 Nov 2026, 16:05" in Sri Lanka time, for the report footer. */
export function generatedStamp(): string {
  return formatDateTime(new Date());
}

/**
 * Renders a report and wraps it as a download. Private, never cached: these
 * hold guest names and money.
 */
export async function pdfResponse(document: ReactElement, filename: string): Promise<Response> {
  // Each report component renders a <Document>; the library's typings only
  // accept the Document element itself, not a component that returns one.
  const buffer = await renderToBuffer(document as ReactElement<DocumentProps>);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
