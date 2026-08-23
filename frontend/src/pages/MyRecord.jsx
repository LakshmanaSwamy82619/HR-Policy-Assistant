import { useEffect, useState } from "react";
import { CalendarDays, HeartPulse, ShieldCheck, AlertCircle, RefreshCcw } from "lucide-react";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import { getMyRecord } from "../services/hrisService";

const ENROLLMENT_TONE = {
  active: "text-success",
  enrolled: "text-success",
  pending: "text-warn",
};

export default function MyRecord() {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getMyRecord()
      .then(setRecord)
      .catch((err) => setError(err.message || "Couldn't load your HR record"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-medium text-ink">My HR record</h1>
            <p className="mt-1.5 text-sm text-ink2">
              Live data from HRIS, scoped to your account only.
            </p>
          </div>

          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32 sm:col-span-2" />
            </div>
          )}

          {!loading && error && (
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load your record"
              description={error}
              action={
                <Button variant="outline" icon={RefreshCcw} onClick={load}>
                  Try again
                </Button>
              }
            />
          )}

          {!loading && !error && record && (
            <div className="animate-fadeUp grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-moss-50 text-moss-500">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink2">Leave balance</p>
                    <p className="font-display text-2xl font-medium text-ink">
                      {record.leave_balance_days} <span className="text-sm font-sans text-ink2">days</span>
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink2">Enrollment status</p>
                    <p
                      className={`font-display text-2xl font-medium capitalize ${
                        ENROLLMENT_TONE[record.enrollment_status?.toLowerCase()] || "text-ink"
                      }`}
                    >
                      {record.enrollment_status}
                    </p>
                  </div>
                </div>
              </Card>

              {record.leave_breakdown && Object.keys(record.leave_breakdown).length > 0 && (
                <Card className="sm:col-span-2">
                  <p className="mb-4 text-xs font-medium uppercase tracking-wide text-ink2">Leave breakdown</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {Object.entries(record.leave_breakdown).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-line bg-paper/60 px-3.5 py-3">
                        <p className="text-[11px] capitalize text-ink2">{key.replace(/_/g, " ")}</p>
                        <p className="mt-0.5 font-mono text-lg text-ink">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="sm:col-span-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-moss-50 text-moss-500">
                    <HeartPulse className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink2">Benefits plan</p>
                    <p className="font-display text-lg font-medium text-ink">
                      {record.benefits_plan || "Not enrolled in a plan"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
