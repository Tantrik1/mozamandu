
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { 
  Home, 
  Package, 
  Users, 
  Gift, 
  Tag, 
  CreditCard, 
  Truck, 
  Bell, 
  Type, 
  Settings,
  ShoppingCart,
  UserCheck,
  LogOut,
  HelpCircle,
  Warehouse
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Categories",
    url: "/admin/categories",
    icon: Package,
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
    title: "Inventory",
    url: "/admin/inventory",
    icon: Warehouse,
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Customers",
    url: "/admin/customers",
    icon: UserCheck,
  },
  {
    title: "Combos",
    url: "/admin/combos",
    icon: Gift,
  },
  {
    title: "Promo Codes",
    url: "/admin/promocodes",
    icon: Tag,
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
    icon: Type,
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
]

export function AdminSidebar() {
  const location = useLocation()
  const { signOut } = useAuth()

  const handleSignOut = () => {
    signOut()
  }

  const handleNavClick = (url: string) => {
    console.log(`🔗 AdminSidebar: Navigating to ${url}`)
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url === "/admin" && location.pathname === "/admin");
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link 
                        to={item.url}
                        onClick={() => handleNavClick(item.url)}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
