import { Bell, LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import {
  listenForForegroundMessages,
  triggerBrowserNotification,
} from "../service/notification.service";
import { getNotifications } from "../api/notificationApi";
import NotificationDrawer from "../components/NotificationDrawer";

type NavbarProps = {
  onToggleSidebar: () => void;
};

// Subtle Web Audio API chime for incoming notification
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    // AudioContext autoplay might be blocked
  }
};

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { isLoggedIn, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    unreadCount,
    toggleDrawer,
    openDrawer,
    registerFcm,
    fetchNotifications,
    handleRealtimeNotification,
  } = useNotificationStore();

  // Setup FCM push notifications and foreground listener when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    fetchNotifications();
    registerFcm(user?.id);

    const unsubPromise = listenForForegroundMessages((payload: any) => {
      console.log("Foreground message in Navbar:", payload);
      handleRealtimeNotification(payload);
      playNotificationSound();

      const notifTitle = payload?.notification?.title || "EMS Notification";
      const notifBody = payload?.notification?.body || "";

      toast.info(notifTitle, {
        description: notifBody,
        action: {
          label: "View",
          onClick: () => openDrawer(),
        },
      });

      triggerBrowserNotification(notifTitle, {
        body: notifBody,
      });
    });

    return () => {
      unsubPromise.then((unsub: any) => {
        if (typeof unsub === "function") unsub();
      });
    };
  }, [isLoggedIn, user?.id]);

  // Real-time polling check (every 5s) to guarantee popup even if FCM push is delayed or blocked
  useEffect(() => {
    if (!isLoggedIn) return;

    const knownIds = new Set<number>();
    let isFirstRun = true;

    const syncNewNotifications = async () => {
      try {
        const res = await getNotifications({ page: 1, limit: 15 });
        const list = res.notifications || [];

        if (isFirstRun) {
          list.forEach((n) => knownIds.add(n.id));
          isFirstRun = false;
          return;
        }

        const newItems = list.filter((n) => !knownIds.has(n.id) && !n.isRead);
        list.forEach((n) => knownIds.add(n.id));

        if (newItems.length > 0) {
          playNotificationSound();
          fetchNotifications();

          newItems.forEach((n) => {
            toast.info(n.title, {
              description: n.message,
              action: {
                label: "View",
                onClick: () => openDrawer(),
              },
            });

            triggerBrowserNotification(n.title, {
              body: n.message,
            });
          });
        }
      } catch (err) {
        // silent
      }
    };

    syncNewNotifications();
    const interval = setInterval(syncNewNotifications, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  const initial = (
    user?.name?.trim()?.[0] ||
    user?.email?.trim()?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-xs">
        <div className="flex h-16 items-center px-4 md:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-100 cursor-pointer"
              onClick={onToggleSidebar}
            >
              <Menu size={18} />
            </button>
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-sm">EMS</span>
            </div>
            <h1 className="hidden sm:block text-lg font-bold text-gray-800 tracking-tight">
              EMS Portal
            </h1>
          </div>

          {/* Center: Title */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-lg md:text-xl font-bold text-gray-800 hidden md:block">
              Employee Management System
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Notification Bell Button */}
                <button
                  type="button"
                  onClick={toggleDrawer}
                  className="relative p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer select-none"
                  title="Notifications"
                  aria-label="View notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[11px] font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 text-white font-bold text-base flex items-center justify-center shadow-xs ring-2 ring-white ring-offset-2 ring-offset-sky-100 hover:opacity-95 hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 select-none"
                    title={user?.name || user?.email || "User profile"}
                    aria-label="User profile"
                    aria-expanded={dropdownOpen}
                  >
                    {initial}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-sky-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {user?.name || "Admin User"}
                            </p>
                            {user?.email && (
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left cursor-pointer"
                        >
                          <LogOut size={16} />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button className="h-10 cursor-pointer bg-sky-500 px-4 text-white transition-colors hover:bg-sky-600">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-over Notifications Drawer */}
      <NotificationDrawer />
    </>
  );
};

export default Navbar;
