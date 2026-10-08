import React, { useEffect } from "react";
import { Bell, Check, CheckCircle2, Clock3, Loader2, X } from "lucide-react";
import { useNotificationStore } from "../store/notificationStore";

function formatTimeAgo(dateString: string): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) return "Just now";
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return "1 minute ago";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return "about 1 hour ago";
  if (diffInHours < 24) return `about ${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 30) return `${diffInDays} days ago`;
  return date.toLocaleDateString();
}

export const NotificationDrawer: React.FC = () => {
  const {
    isOpen,
    closeDrawer,
    notifications,
    unreadCount,
    total,
    page,
    totalPages,
    filter,
    setFilter,
    setPage,
    markAsRead,
    markAllRead,
    loading,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filters = [
    { label: "All", value: "All" },
    { label: "Task Assigned", value: "Task Assigned" },
    { label: "Task Completed", value: "Task Completed" },
    { label: "Unread", value: "Unread" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={closeDrawer}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-800" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mark all as read</span>
              </button>

              <button
                type="button"
                onClick={closeDrawer}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/40">
            {filters.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-sky-500 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/30">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-center text-gray-400 p-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No notifications found</p>
                <p className="text-xs text-gray-400 mt-1">
                  You are all caught up! When tasks are assigned or completed, messages will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`relative rounded-xl border p-4 transition-all duration-150 shadow-2xs ${
                    n.isRead
                      ? "bg-white border-gray-200/80 hover:border-gray-300"
                      : "bg-white border-sky-200 hover:border-sky-300 shadow-xs"
                  }`}
                >
                  {/* Top Row: Title & Unread indicator */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-gray-900 leading-snug">
                      {n.title}
                    </h3>
                    {!n.isRead && (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1 shadow-xs"
                        title="Unread"
                      />
                    )}
                  </div>

                  {/* Body description */}
                  <p className="text-xs md:text-sm text-gray-600 mt-1.5 leading-relaxed">
                    {n.message}
                  </p>

                  {/* Bottom Row: Timestamp & Read Status / Check Action */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100/80">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>{formatTimeAgo(n.createdAt)}</span>
                    </div>

                    <div>
                      {n.isRead ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <Check className="w-3.5 h-3.5" /> Read
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markAsRead(n.id)}
                          className="h-7 w-7 rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 flex items-center justify-center transition-all cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Pagination */}
          <div className="px-5 py-3 border-t border-gray-200 bg-white flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-500">
              Page <span className="font-bold text-gray-800">{page}</span> of{" "}
              <span className="font-bold text-gray-800">{totalPages}</span> ·{" "}
              <span className="font-bold text-gray-800">{total}</span> total
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
