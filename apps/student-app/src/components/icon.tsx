import {
  ArrowLeft01Icon,
  Award01Icon,
  Calendar01Icon,
  Camera01Icon,
  CheckmarkCircle02Icon,
  ChevronRightIcon,
  Clock01Icon,
  Copy01Icon,
  FireIcon,
  HelpCircleIcon,
  Home01Icon,
  KeyboardIcon,
  Logout01Icon,
  MapPinIcon,
  QrCodeIcon,
  QuoteUpIcon,
  Settings01Icon,
  SignalIcon,
  UserIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";

export type IconName =
  | "home"
  | "calendar"
  | "wallet"
  | "user"
  | "qr-code"
  | "flame"
  | "award"
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

const icons = {
  home: Home01Icon,
  calendar: Calendar01Icon,
  wallet: Wallet01Icon,
  user: UserIcon,
  "qr-code": QrCodeIcon,
  flame: FireIcon,
  award: Award01Icon,
  "check-circle": CheckmarkCircle02Icon,
  "chevron-right": ChevronRightIcon,
  "arrow-left": ArrowLeft01Icon,
  copy: Copy01Icon,
  camera: Camera01Icon,
  settings: Settings01Icon,
  help: HelpCircleIcon,
  "log-out": Logout01Icon,
  clock: Clock01Icon,
  "map-pin": MapPinIcon,
  signal: SignalIcon,
  keyboard: KeyboardIcon,
  quote: QuoteUpIcon,
} as const;

export function Icon({ name, size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) {
  return <HugeiconsIcon icon={icons[name]} size={size} color={color} strokeWidth={strokeWidth} />;
}
