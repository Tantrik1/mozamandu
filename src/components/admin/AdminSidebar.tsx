
import { Home, Package, ShoppingCart, Users, Gift, Percent, CreditCard, Truck, Bell, Type, Settings, HelpCircle, List, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Categories",
    url: "/admin/categories",
    icon: List,
  },
  {
    title: "Subcategories",
    url: "/admin/subcategories",
    icon: Package,
  },
  {
    title: "Products",
    url: "/admin/products",
    icon: Package,
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Customers",
    url: "/admin/customers",
    icon: Users,
  },
  {
    title: "Combos",
    url: "/admin/combos",
    icon: Gift,
  },
  {
    title: "Promocodes",
    url: "/admin/promocodes",
    icon: Percent,
  },
  {
    title: "Payment Methods",
    url: "/admin/payments",
    icon: CreditCard,
  },
  {
    title: "Delivery Charges",
    url: "/admin/delivery-charges",
    icon: Truck,
  },
  {
    title: "Notices",
    url: "/admin/notices",
    icon: Bell,
  },
  {
    title: "Top Bar Text",
    url: "/admin/top-bar-text",
    icon: Type,
  },
  {
    title: "Navbar",
    url: "/admin/navbar",
    icon: Menu,
  },
  {
    title: "FAQs",
    url: "/admin/faqs",
    icon: HelpCircle,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
