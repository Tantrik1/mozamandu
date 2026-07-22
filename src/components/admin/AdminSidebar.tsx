import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, Package, Users, Tag, CreditCard, Truck, Bell, Type, Settings, ShoppingCart, UserCheck, LogOut, HelpCircle, Warehouse, MessageSquare, BarChart3, Key, FileText, Image as ImageIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [{
  title: "Dashboard",
  url: "/admin",
  icon: Home
}, {
  title: "Categories",
  url: "/admin/categories",
  icon: Package
}, {
  title: "Subcategories",
  url: "/admin/subcategories",
  icon: Package
}, {
  title: "Products",
  url: "/admin/products",
  icon: Package
}, {
  title: "Inventory",
  url: "/admin/inventory",
  icon: Warehouse
}, {
  title: "Orders",
  url: "/admin/orders",
  icon: ShoppingCart
}, {
  title: "Customers",
  url: "/admin/customers",
  icon: UserCheck
}, {
  title: "Promo Codes",
  url: "/admin/promocodes",
  icon: Tag
}, {
  title: "Payment Methods",
  url: "/admin/payments",
  icon: CreditCard
}, {
  title: "Delivery Charges",
  url: "/admin/delivery-charges",
  icon: Truck
}, {
  title: "Notices",
  url: "/admin/notices",
  icon: Bell
}, {
  title: "Top Bar Text",
  url: "/admin/top-bar-text",
  icon: Type
}, {
  title: "FAQs",
  url: "/admin/faqs",
  icon: HelpCircle
}, {
  title: "Reviews",
  url: "/admin/reviews",
  icon: MessageSquare
}, {
  title: "Blogs",
  url: "/admin/blogs",
  icon: FileText
}, {
  title: "Media",
  url: "/admin/media",
  icon: ImageIcon
}, {
  title: "Analytics",
  url: "/admin/analytics",
  icon: BarChart3
}, {
  title: "Analytics Settings",
  url: "/admin/analytics-settings",
  icon: Key
}, {
  title: "Settings",
  url: "/admin/settings",
  icon: Settings
}];

export function AdminSidebar() {
  const location = useLocation();
  const {
    signOut
  } = useAuth();
  const handleSignOut = () => {
    signOut();
  };
  const handleNavClick = (url: string) => {
    console.log(`🔗 AdminSidebar: Navigating to ${url}`);
  };
  return <Sidebar className="border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <SidebarContent className="p-4 bg-gray-50">
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">A</span>
          </div>
          <div>
            <h2 className="font-semibold text-lg">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Management Portal</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map(item => {
              const isActive = location.pathname === item.url || item.url === "/admin" && location.pathname === "/admin";
              return <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className="h-11 px-3 rounded-lg transition-all duration-200 hover:bg-accent/50 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm">
                      <Link to={item.url} onClick={() => handleNavClick(item.url)} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>;
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t bg-slate-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="h-11 px-3 rounded-lg transition-all duration-200 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>;
}
