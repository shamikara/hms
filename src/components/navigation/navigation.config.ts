import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Users,
  Compass,
  UtensilsCrossed,
  Receipt,
  Settings,
  ShieldCheck,
  FileText,
  Sliders,
  Building2,
  TreePine,
  Tent,
  Truck,
} from "lucide-react";

export interface Property {
  id: string;
  name: string;
  code: string;
  location: string;
  status: "ONLINE" | "MAINTENANCE" | "PEAK";
  icon: typeof Building2;
}

export const HMS_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    name: "Lily Resort Udawalawe",
    code: "LIL-01",
    location: "Udawalawe, Sri Lanka",
    status: "PEAK",
    icon: TreePine,
  },
  {
    id: "prop-2",
    name: "Yala Wilderness Tents",
    code: "YAL-02",
    location: "Yala National Park",
    status: "ONLINE",
    icon: Tent,
  },
  {
    id: "prop-3",
    name: "Wilpattu Eco Lodge",
    code: "WIL-03",
    location: "Wilpattu, Sri Lanka",
    status: "ONLINE",
    icon: Building2,
  },
];

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: string;
  badgeVariant?: "default" | "emerald" | "amber" | "destructive";
  roles?: string[];
  permissions?: string[];
  shortcut?: string;
}

export interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export const HMS_NAVIGATION_CONFIG: NavGroup[] = [
  {
    groupLabel: "Overview & Front Desk",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        shortcut: "G D",
      },
      {
        title: "Bookings & Check-in",
        href: "/admin/bookings",
        icon: CalendarCheck,
        badge: "12 Today",
        badgeVariant: "emerald",
        shortcut: "G B",
      },
      {
        title: "Room Inventory",
        href: "/admin/rooms",
        icon: BedDouble,
        shortcut: "G R",
      },
      {
        title: "Guest CRM",
        href: "/admin/guests",
        icon: Users,
        shortcut: "G G",
      },
    ],
  },
  {
    groupLabel: "Resort Operations",
    items: [
      {
        title: "Safari Operations",
        href: "/admin/safari",
        icon: Compass,
        badge: "3 Active",
        badgeVariant: "amber",
        shortcut: "G S",
      },
      {
        title: "Safari Fleet",
        href: "/admin/safari/fleet",
        icon: Truck,
        shortcut: "G V",
      },
      {
        title: "Dining & Bar POS",
        href: "/admin/restaurant",
        icon: UtensilsCrossed,
        shortcut: "G P",
      },
    ],
  },
  {
    groupLabel: "Finance & Enterprise",
    items: [
      {
        title: "Revenue & Finance",
        href: "/admin/finance",
        icon: Receipt,
        roles: ["SUPER_ADMIN", "FINANCE_OFFICER", "RESORT_MANAGER"],
        shortcut: "G F",
      },
    ],
  },
];
