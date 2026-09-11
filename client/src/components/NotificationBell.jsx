import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Info,
  MessageSquare,
  ShieldAlert,
  Ticket,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api.js";
import { formatRelativeTime } from "../utils/format.js";

const iconMap = {
  TICKET_CREATED: Ticket,
  TICKET_REPLIED: MessageSquare,
  TICKET_REOPENED: Ticket,
  TICKET_RESOLVED: Check,
  TICKET_CLOSED: Check,
  MESSAGE_ADDED: MessageSquare,
  ASSIGNED: UserCheck,
  REASSIGNED: UserCheck,
  STATUS_CHANGED: Info,
  PRIORITY_CHANGED: ShieldAlert,
  INTERNAL_NOTE_ADDED: MessageSquare,
  RESOLVED: Check,
  CLOSED: Check,
  REOPENED: Ticket,
  SLA_RESPONSE_BREACHED: ShieldAlert,
  SLA_RESOLUTION_BREACHED: ShieldAlert,
};

function getNotificationIcon(type) {
  return iconMap[type] || Bell;
}

function getNotificationText(notification) {
  if (notification.message) return notification.message;

  const ticketNumber = notification.metadata?.ticketNumber || "your ticket";

  const messages = {
    TICKET_CREATED: `New ticket ${ticketNumber} was created.`,
    TICKET_REPLIED: `New message on ${ticketNumber}.`,
    TICKET_REOPENED: `${ticketNumber} was reopened.`,
    TICKET_RESOLVED: `${ticketNumber} was resolved.`,
    TICKET_CLOSED: `${ticketNumber} was closed.`,
    MESSAGE_ADDED: `New message on ${ticketNumber}.`,
    ASSIGNED: `${ticketNumber} was assigned to you.`,
    REASSIGNED: `${ticketNumber} was reassigned.`,
    STATUS_CHANGED: `${ticketNumber} status was updated.`,
    PRIORITY_CHANGED: `${ticketNumber} priority changed.`,
    INTERNAL_NOTE_ADDED: `Internal note added to ${ticketNumber}.`,
    RESOLVED: `${ticketNumber} was resolved.`,
    CLOSED: `${ticketNumber} was closed.`,
    REOPENED: `${ticketNumber} was reopened.`,
    SLA_RESPONSE_BREACHED: `${ticketNumber} missed its first response target.`,
    SLA_RESOLUTION_BREACHED: `${ticketNumber} missed its resolution target.`,
  };

  return messages[notification.type] || `Update on ${ticketNumber}.`;
}

export default function NotificationBell() {
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      const data = response.data.data;
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load notifications.");
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNotification = (notification) => {
      setNotifications((current) => {
        if (
          notification?._id &&
          current.some((item) => item._id === notification._id)
        ) {
          return current;
        }
        return [notification, ...current].slice(0, 20);
      });
      setUnreadCount((current) => current + 1);
    };

    socket.on("notification:created", handleNotification);
    return () => socket.off("notification:created", handleNotification);
  }, [socket]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const markRead = async (notification) => {
    if (!notification?._id || notification.read) return;

    try {
      await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? { ...item, read: true }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
        })),
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.response?.data?.message || "Could not mark all as read.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen((current) => !current);
    if (!open) loadNotifications();
  };

  const getTicketUrl = (notification) => {
    const ticketId =
      notification.ticket?._id ||
      notification.ticketId ||
      notification.metadata?.ticketId;
    return ticketId ? `/tickets/${ticketId}` : null;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-5 text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-dropdown">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Notifications
              </h2>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={loading}
                  title="Mark all as read"
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Bell className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No notifications
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ticket updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const ticketUrl = getTicketUrl(notification);

                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition-colors ${
                      notification.read
                        ? "hover:bg-slate-50"
                        : "bg-brand-50/60 hover:bg-brand-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        notification.read
                          ? "bg-slate-100 text-slate-400"
                          : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-5 text-slate-800">
                          {getNotificationText(notification)}
                        </p>
                        {!notification.read && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        {ticketUrl && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-brand-600">
                              View ticket
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {!notification.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead(notification);
                        }}
                        title="Mark as read"
                        className="self-start rounded-md p-1 text-slate-300 transition-colors hover:bg-white hover:text-slate-600"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );

                return ticketUrl ? (
                  <Link
                    key={notification._id}
                    to={ticketUrl}
                    onClick={() => {
                      markRead(notification);
                      setOpen(false);
                    }}
                    className="block border-b border-slate-100 last:border-b-0"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={notification._id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
