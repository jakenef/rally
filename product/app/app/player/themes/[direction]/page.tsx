import { notFound } from "next/navigation";
import { ThemePreview, type Direction } from "../ThemePreview";

const directions = ["courtline", "matchpoint", "baseline"] as const;

export function generateStaticParams() {
  return directions.map((direction) => ({ direction }));
}

export default async function Theme({ params }: { params: Promise<{ direction: string }> }) {
  const { direction } = await params;
  if (!directions.includes(direction as Direction)) notFound();
  return <ThemePreview direction={direction as Direction} />;
}
