import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../services/authService";

export default function Settings() {
  const { email, isAdmin } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.current) next.current = "Enter your current password";
    if (form.next.length < 8) next.next = "At least 8 characters";
    if (form.confirm !== form.next) next.confirm = "Doesn't match the new password";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await changePassword(form.current, form.next);
      toast.success("Password updated");
      setForm({ current: "", next: "", confirm: "" });
      setErrors({});
    } catch (err) {
      toast.error(err.message || "Couldn't update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-medium text-ink">Settings</h1>
            <p className="mt-1.5 text-sm text-ink2">Manage your account.</p>
          </div>

          <Card className="mb-6 animate-fadeUp">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-50 text-moss-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{email}</p>
                <p className="text-xs text-ink2">{isAdmin ? "Admin access" : "Employee"}</p>
              </div>
            </div>
          </Card>

          <Card className="animate-fadeUp">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-ink2" />
              <h2 className="font-display text-base font-medium text-ink">Change password</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Current password"
                type="password"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                error={errors.current}
              />
              <Input
                label="New password"
                type="password"
                value={form.next}
                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                error={errors.next}
                hint="At least 8 characters."
              />
              <Input
                label="Confirm new password"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                error={errors.confirm}
              />
              <div>
                <Button type="submit" loading={submitting} icon={KeyRound}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
