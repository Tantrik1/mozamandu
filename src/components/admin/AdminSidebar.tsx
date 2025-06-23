
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Package,
  FolderTree,
  Grid3X3,
  Gift,
  Percent,
  Truck,
  LayoutDashboard,
  LogOut,
  Store,
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: 'Categories',
    url: '/admin/categories',
    icon: FolderTree,
  },
  {
    title: 'Subcategories',
    url: '/admin/subcategories',
    icon: Grid3X3,
  },
  {
    title: 'Products',
    url: '/admin/products',
    icon: Package,
  },
  {
    title: 'Combos',
    url: '/admin/combos',
    icon: Gift,
  },
  {
    title: 'Promocodes',
    url: '/admin/promocodes',
    icon: Percent,
  },
  {
    title: 'Delivery Charges',
    url: '/admin/delivery-charges',
    icon: Truck,
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActiveRoute = (item: typeof menuItems[0]) => {
    if (item.exact) {
      return location.pathname === item.url;
    }
    return location.pathname.startsWith(item.url);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-6">
        <div className="flex items-center space-x-2">
          <Store className="h-8 w-8 text-blue-600" />
          <div>
            <div className="text-xl font-bold text-blue-600">Mozamandu</div>
            <div className="text-sm text-gray-500">Admin Panel</div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-500 font-medium mb-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActiveRoute(item)} className="w-full">
                    <Link to={item.url} className="flex items-center space-x-3 px-3 py-2 rounded-lg">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full justify-start space-x-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
