import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

export type IconName =
  | "home"
  | "calendar"
  | "wallet"
  | "user"
  | "qr-code"
  | "flame"
  | "check-circle"
  | "chevron-right"
  | "arrow-left"
  | "copy"
  | "camera"
  | "settings"
  | "help"
  | "log-out"
  | "clock"
  | "map-pin"
  | "signal"
  | "keyboard"
  | "quote";

type IconProps = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) {
  const common = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth,
  };
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <Path {...common} d="M3 10.5 12 3l9 7.5V21H3Z" />
        <Path {...common} d="M9 21v-7h6v7" />
      </>
    ),
    calendar: (
      <>
        <Rect {...common} x="3" y="5" width="18" height="16" rx="2" />
        <Line {...common} x1="3" y1="9" x2="21" y2="9" />
        <Line {...common} x1="8" y1="3" x2="8" y2="7" />
        <Line {...common} x1="16" y1="3" x2="16" y2="7" />
      </>
    ),
    wallet: (
      <>
        <Path {...common} d="M4 6h14a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" />
        <Path {...common} d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
    user: (
      <>
        <Circle {...common} cx="12" cy="8" r="4" />
        <Circle {...common} cx="12" cy="12" r="9" />
        <Path {...common} d="M5.5 19a7 7 0 0 1 13 0" />
      </>
    ),
    "qr-code": (
      <>
        <Path
          {...common}
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2M20 14v3M14 18v2M18 20h2"
        />
      </>
    ),
    flame: <Path {...common} d="M13 2s1 5-3 8c-2-3-4-1-4 3a6 6 0 0 0 12 0c0-4-2-7-5-11Z" />,
    "check-circle": (
      <>
        <Circle {...common} cx="12" cy="12" r="9" />
        <Polyline {...common} points="8 12 11 15 16 9" />
      </>
    ),
    "chevron-right": <Polyline {...common} points="9 18 15 12 9 6" />,
    "arrow-left": (
      <>
        <Line {...common} x1="20" y1="12" x2="4" y2="12" />
        <Polyline {...common} points="10 18 4 12 10 6" />
      </>
    ),
    copy: (
      <>
        <Rect {...common} x="8" y="8" width="12" height="12" rx="2" />
        <Path {...common} d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    camera: (
      <>
        <Rect {...common} x="3" y="6" width="18" height="14" rx="3" />
        <Circle {...common} cx="12" cy="13" r="4" />
        <Path {...common} d="m8 6 1.5-2h5L16 6" />
      </>
    ),
    settings: (
      <>
        <Circle {...common} cx="12" cy="12" r="3" />
        <Path
          {...common}
          d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7Z"
        />
      </>
    ),
    help: (
      <>
        <Circle {...common} cx="12" cy="12" r="9" />
        <Circle {...common} cx="12" cy="12" r="5" />
        <Line {...common} x1="6" y1="6" x2="8.5" y2="8.5" />
        <Line {...common} x1="15.5" y1="15.5" x2="18" y2="18" />
      </>
    ),
    "log-out": (
      <>
        <Path {...common} d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
        <Line {...common} x1="9" y1="12" x2="21" y2="12" />
        <Polyline {...common} points="17 8 21 12 17 16" />
      </>
    ),
    clock: (
      <>
        <Circle {...common} cx="12" cy="12" r="9" />
        <Polyline {...common} points="12 7 12 12 16 14" />
      </>
    ),
    "map-pin": (
      <>
        <Path {...common} d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <Circle {...common} cx="12" cy="10" r="2" />
      </>
    ),
    signal: (
      <>
        <Line {...common} x1="5" y1="20" x2="5" y2="16" />
        <Line {...common} x1="10" y1="20" x2="10" y2="12" />
        <Line {...common} x1="15" y1="20" x2="15" y2="8" />
        <Line {...common} x1="20" y1="20" x2="20" y2="4" />
      </>
    ),
    keyboard: (
      <>
        <Rect {...common} x="2" y="6" width="20" height="13" rx="2" />
        <Path
          {...common}
          d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h4M7 17h10"
        />
      </>
    ),
    quote: (
      <Path {...common} d="M9 11H4c0-4 2-6 5-7M20 11h-5c0-4 2-6 5-7M4 11v7h5v-7M15 11v7h5v-7" />
    ),
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths[name]}
    </Svg>
  );
}
