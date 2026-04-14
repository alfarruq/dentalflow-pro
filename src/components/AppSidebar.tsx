import { LayoutDashboard, Users, CalendarDays, Package, BarChart3, UserCircle, LogOut, Wallet, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { key: "dashboard", path: "/", icon: LayoutDashboard },
  { key: "patients", path: "/patients", icon: Users },
  { key: "appointments", path: "/appointments", icon: CalendarDays },
  { key: "reminders", path: "/reminders", icon: Bell },
  { key: "inventory", path: "/inventory", icon: Package },
  { key: "finance", path: "/finance", icon: Wallet },
  { key: "analytics", path: "/analytics", icon: BarChart3 },
  { key: "profile", path: "/profile", icon: UserCircle },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/40 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            D
          </div>
          {!collapsed && (
            <span className="font-semibold text-[15px] tracking-tight text-foreground">
              DentaFlow
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3 px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={t(`nav.${item.key}`)}
                  >
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      className="rounded-xl transition-all duration-200 hover:bg-sidebar-accent/60"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-[18px] w-[18px] stroke-[1.4]" />
                      {!collapsed && <span className="text-[13px]">{t(`nav.${item.key}`)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/40 p-4">
        {!collapsed && user && (
          <div className="mb-2 px-2 text-sm font-medium text-foreground truncate">
            {user.name}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("common.logout")}
              onClick={handleLogout}
              className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-[18px] w-[18px] stroke-[1.4]" />
              {!collapsed && <span className="text-[13px]">{t("common.logout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
