import { Briefcase, ClipboardList, LayoutDashboard, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Sheet, SheetClose, SheetContent } from "../components/ui/sheet";

const navItems = [
  { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
  { name: "Designation", path: "/designation", icon: <Briefcase size={20} /> },
  { name: "Employees", path: "/employees", icon: <Users size={20} /> },
  { name: "Tasks", path: "/tasks", icon: <ClipboardList size={20} /> },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile Drawer */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
          <SheetContent side="left" className="h-[100dvh] w-72 bg-gray-900 text-white p-0 border-none">
            <SidebarContent isMobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar (Full Height) */}
      <aside className="hidden md:flex h-full w-72 shrink-0 flex-col bg-gray-900 text-white border-r border-gray-800">
        <SidebarContent />
      </aside>
    </>
  );
};

const SidebarContent = ({ isMobile }: { isMobile?: boolean }) => {




  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand Section */}
      <div className="px-6 py-4 text-2xl font-bold tracking-tight text-white border-b border-gray-800">
        EMS
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const link = (
            <Link
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-all"
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          );

          return isMobile ? (
            <SheetClose key={item.path}>{link}</SheetClose>
          ) : (
            <div key={item.path}>{link}</div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
