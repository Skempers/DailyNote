import {
  BookOpen,
  Cake,
  Car,
  CloudRain,
  Coffee,
  Film,
  Flame,
  Gift,
  GraduationCap,
  Plane,
  Star,
  Thermometer,
} from "lucide-react";
import type { EntryMarker } from "@/lib/slog/types";

const MAP: Record<EntryMarker, typeof Star> = {
  flight: Plane,
  car: Car,
  birthday: Cake,
  gift: Gift,
  sick: Thermometer,
  rain: CloudRain,
  candle: Flame,
  grad: GraduationCap,
  star: Star,
  coffee: Coffee,
  book: BookOpen,
  film: Film,
};

export function MarkerIcon({
  marker,
  className = "size-3.5 shrink-0",
}: {
  marker: EntryMarker | null;
  className?: string;
}) {
  if (!marker) return null;
  const Icon = MAP[marker];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={1.75} />;
}

export const MARKERS: { id: EntryMarker; label: string }[] = [
  { id: "flight", label: "飞机" },
  { id: "car", label: "车" },
  { id: "birthday", label: "生日" },
  { id: "gift", label: "礼物" },
  { id: "sick", label: "生病" },
  { id: "rain", label: "雨" },
  { id: "candle", label: "缅怀" },
  { id: "grad", label: "毕业" },
  { id: "star", label: "骄傲" },
  { id: "coffee", label: "咖啡" },
  { id: "book", label: "书" },
  { id: "film", label: "电影" },
];
