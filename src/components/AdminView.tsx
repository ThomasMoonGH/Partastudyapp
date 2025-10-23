import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertTriangle, Shield, Ban, CheckCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface Report {
  id: string;
  reporterEmail: string;
  reportedUser: string;
  reason: string;
  details: string;
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface BlockedUser {
  email: string;
  name: string;
  blockedAt: Date;
  reason: string;
}

export function AdminView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load reports
      const reportsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/admin/reports`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(
          reportsData.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          }))
        );
      }

      // Load blocked users
      const blockedResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/admin/blocked-users`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (blockedResponse.ok) {
        const blockedData = await blockedResponse.json();
        setBlockedUsers(
          blockedData.map((u: any) => ({
            ...u,
            blockedAt: new Date(u.blockedAt),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (report: Report) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/admin/block-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: report.reportedUser,
            name: report.reportedUser,
            reason: report.reason,
          }),
        }
      );

      if (response.ok) {
        toast.success("Пользователь заблокирован");
        
        // Update report status
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/admin/update-report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              reportId: report.id,
              status: "resolved",
            }),
          }
        );
        
        loadData();
      } else {
        throw new Error("Failed to block user");
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Ошибка блокировки пользователя");
    } finally {
      setActionLoading(false);
      setShowBlockDialog(false);
      setSelectedReport(null);
    }
  };

  const handleUnblockUser = async (email: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/admin/unblock-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        toast.success("Пользователь разблокирован");
        loadData();
      } else {
        throw new Error("Failed to unblock user");
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Ошибка разблокировки пользователя");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsReviewed = async (reportId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/admin/update-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            reportId,
            status: "reviewed",
          }),
        }
      );

      if (response.ok) {
        toast.success("Жалоба отмечена как рассмотренная");
        loadData();
      } else {
        throw new Error("Failed to update report");
      }
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Ошибка обновления жалобы");
    } finally {
      setActionLoading(false);
    }
  };

  const getReasonText = (reason: string) => {
    const reasons: { [key: string]: string } = {
      harassment: "Неподобающее поведение",
      spam: "Спам или реклама",
      distraction: "Отвлекающее поведение",
      other: "Другое",
    };
    return reasons[reason] || reason;
  };

  const pendingReports = reports.filter((r) => r.status === "pending");
  const reviewedReports = reports.filter((r) => r.status === "reviewed");
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Админка
        </h2>
        <p className="text-gray-600">Модерация жалоб и управление пользователями</p>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">
            Жалобы
            {pendingReports.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Заблокированные
            {blockedUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {blockedUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <div>
            <h3 className="mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Новые жалобы ({pendingReports.length})
            </h3>
            {pendingReports.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Нет новых жалоб</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingReports.map((report) => (
                  <Card key={report.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="destructive">Новая</Badge>
                          <Badge variant="outline">{getReasonText(report.reason)}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Жалоба от:</span>{" "}
                            <span className="font-medium">{report.reporterEmail}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">На пользователя:</span>{" "}
                            <span className="font-medium">{report.reportedUser}</span>
                          </div>
                          {report.details && (
                            <div>
                              <span className="text-gray-600">Детали:</span>
                              <p className="mt-1 text-gray-900">{report.details}</p>
                            </div>
                          )}
                          <div className="text-gray-500">
                            {report.timestamp.toLocaleString("ru-RU")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsReviewed(report.id)}
                          disabled={actionLoading}
                        >
                          Рассмотрено
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowBlockDialog(true);
                          }}
                          disabled={actionLoading}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Заблокировать
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {reviewedReports.length > 0 && (
            <div>
              <h3 className="mb-4">Рассмотренные ({reviewedReports.length})</h3>
              <div className="grid gap-4">
                {reviewedReports.map((report) => (
                  <Card key={report.id} className="p-6 opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">Рассмотрено</Badge>
                          <Badge variant="outline">{getReasonText(report.reason)}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Жалоба от:</span>{" "}
                            <span>{report.reporterEmail}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">На пользователя:</span>{" "}
                            <span>{report.reportedUser}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {resolvedReports.length > 0 && (
            <div>
              <h3 className="mb-4">Решённые ({resolvedReports.length})</h3>
              <div className="grid gap-4">
                {resolvedReports.map((report) => (
                  <Card key={report.id} className="p-6 opacity-40">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Решено</Badge>
                          <Badge variant="outline">{getReasonText(report.reason)}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Жалоба от:</span>{" "}
                            <span>{report.reporterEmail}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">На пользователя:</span>{" "}
                            <span>{report.reportedUser}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-6">
          <div>
            <h3 className="mb-4">Заблокированные пользователи ({blockedUsers.length})</h3>
            {blockedUsers.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Нет заблокированных пользователей</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {blockedUsers.map((user) => (
                  <Card key={user.email} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4>{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <div>
                              <span className="text-gray-600">Причина:</span>{" "}
                              <span>{getReasonText(user.reason)}</span>
                            </div>
                            <div className="text-gray-500">
                              Заблокирован: {user.blockedAt.toLocaleString("ru-RU")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleUnblockUser(user.email)}
                        disabled={actionLoading}
                      >
                        Разблокировать
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Заблокировать пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь заблокировать пользователя{" "}
              <strong>{selectedReport?.reportedUser}</strong> за{" "}
              {selectedReport && getReasonText(selectedReport.reason).toLowerCase()}.
              <br />
              <br />
              Заблокированный пользователь не сможет использовать приложение.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedReport && handleBlockUser(selectedReport)}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Блокировка...
                </>
              ) : (
                "Заблокировать"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
