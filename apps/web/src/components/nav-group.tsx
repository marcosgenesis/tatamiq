import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight01Icon } from "hugeicons-react";
import type { SidebarNavGroup } from "@/components/app-shared";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavGroup({ label, items }: SidebarNavGroup) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          const Icon = item.icon;

          return item.subItems?.length ? (
            <Collapsible
              className="group/collapsible"
              defaultOpen={
                isActive ||
                item.subItems?.some((i) => {
                  const sub = i.path === "/" ? pathname === "/" : pathname.startsWith(i.path);
                  return sub;
                })
              }
              key={item.title}
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger render={<SidebarMenuButton isActive={isActive} />}>
                <Icon className="size-4" />
                <span>{item.title}</span>
                <ArrowRight01Icon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.subItems.map((subItem) => {
                    const subActive =
                      subItem.path === "/" ? pathname === "/" : pathname.startsWith(subItem.path);
                    const SubIcon = subItem.icon;
                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          isActive={subActive}
                          render={<Link to={subItem.path} />}
                        >
                          <SubIcon className="size-4" />
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive} render={<Link to={item.path} />}>
                <Icon className="size-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
