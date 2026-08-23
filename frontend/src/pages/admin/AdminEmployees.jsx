import { useEffect, useState } from "react";
import { Users, UserPlus, RefreshCcw, ShieldCheck, Pencil, UserX, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { UserAvatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { createEmployee, listEmployees, updateEmployee } from "../../services/adminService";

const emptyForm = {
  employee_code: "",
  name: "",
  email: "",
  password: "",
  department: "",
  country: "",
  is_admin: false,
};

const emptyEditForm = { name: "", department: "", country: "", is_admin: false };

export default function AdminEmployees() {
  const { employeeId: currentEmployeeId } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add-employee modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Edit-employee modal
  const [editTarget, setEditTarget] = useState(null); // the employee object being edited, or null
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Per-row deactivate/reactivate in-flight state, keyed by employee id
  const [togglingId, setTogglingId] = useState(null);

  const load = () => {
    setLoading(true);
    listEmployees()
      .then(setEmployees)
      .catch((err) => toast.error(err.message || "Couldn't load employees"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const validate = () => {
    const next = {};
    if (!form.employee_code.trim()) next.employee_code = "Required, e.g. EMP-1002";
    if (!form.name.trim()) next.name = "Enter the employee's full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (form.password.length < 8) next.password = "At least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createEmployee({
        ...form,
        department: form.department || undefined,
        country: form.country || undefined,
      });
      toast.success("Employee created — share the temporary password out of band");
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't create employee");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (employee) => {
    setEditTarget(employee);
    setEditForm({
      name: employee.name,
      department: employee.department || "",
      country: employee.country || "",
      is_admin: employee.is_admin,
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    try {
      await updateEmployee(editTarget.id, {
        name: editForm.name,
        department: editForm.department || null,
        country: editForm.country || null,
        is_admin: editForm.is_admin,
      });
      toast.success("Employee updated");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update employee");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleActive = async (employee) => {
    const deactivating = employee.is_active;
    if (deactivating) {
      const confirmed = window.confirm(
        `Deactivate ${employee.name}? They'll be signed out immediately and won't be able to log back in until reactivated.`
      );
      if (!confirmed) return;
    }
    setTogglingId(employee.id);
    try {
      await updateEmployee(employee.id, { is_active: !deactivating });
      toast.success(deactivating ? `${employee.name} deactivated` : `${employee.name} reactivated`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update employee");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-medium text-ink">Employees</h1>
              <p className="mt-1.5 text-sm text-ink2">Provision access for new hires and manage admin rights.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={RefreshCcw} onClick={load}>
                Refresh
              </Button>
              <Button size="sm" icon={UserPlus} onClick={() => setModalOpen(true)}>
                Add employee
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}

          {!loading && employees.length === 0 && (
            <EmptyState
              icon={Users}
              title="No employees yet"
              description="Add your first employee so they can sign in and start asking the assistant questions."
              action={
                <Button icon={UserPlus} onClick={() => setModalOpen(true)}>
                  Add employee
                </Button>
              }
            />
          )}

          {!loading && employees.length > 0 && (
            <Card className="animate-fadeUp !p-0 overflow-hidden">
              <div className="divide-y divide-line">
                {employees.map((e) => {
                  const isSelf = e.id === currentEmployeeId;
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 px-5 py-3.5 ${!e.is_active ? "opacity-50" : ""}`}
                    >
                      <UserAvatar email={e.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{e.name}</p>
                        <p className="truncate text-xs text-ink2">{e.email}</p>
                      </div>
                      <div className="hidden shrink-0 text-xs text-ink2 sm:block">
                        {e.department || "—"} {e.country ? `· ${e.country}` : ""}
                      </div>
                      <span className="shrink-0 font-mono text-xs text-ink2">{e.employee_code}</span>
                      {e.is_admin && <Badge tone="moss" icon={ShieldCheck}>Admin</Badge>}
                      {!e.is_active && <Badge tone="danger">Deactivated</Badge>}

                      <div className="ml-2 flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          title="Edit employee"
                          className="rounded-lg p-2 text-ink2 transition-colors hover:bg-paper-dim hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleActive(e)}
                            disabled={togglingId === e.id}
                            title={e.is_active ? "Deactivate employee" : "Reactivate employee"}
                            className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                              e.is_active
                                ? "text-ink2 hover:bg-danger/10 hover:text-danger"
                                : "text-ink2 hover:bg-moss-50 hover:text-moss-600"
                            }`}
                          >
                            {e.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add employee */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add an employee"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={submitting} icon={UserPlus}>
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Employee code"
              placeholder="EMP-1002"
              value={form.employee_code}
              onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))}
              error={errors.employee_code}
            />
            <Input
              label="Full name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={errors.name}
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="jane.doe@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />
          <Input
            label="Temporary password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password}
            hint="Tell the employee to change this via Settings after first login."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              placeholder="Optional"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
            <Input
              label="Country"
              placeholder="Optional"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-moss-500 focus:ring-moss-500/30"
            />
            Grant admin privileges
          </label>
        </form>
      </Modal>

      {/* Edit employee */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit ${editTarget.name}` : "Edit employee"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} loading={editSubmitting} icon={Pencil}>
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form onSubmit={handleEditSave} className="flex flex-col gap-4">
            <p className="text-xs text-ink2">
              {editTarget.email} · <span className="font-mono">{editTarget.employee_code}</span>
              <br />
              Email and employee code can't be changed here.
            </p>
            <Input
              label="Full name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Department"
                placeholder="Optional"
                value={editForm.department}
                onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
              />
              <Input
                label="Country"
                placeholder="Optional"
                value={editForm.country}
                onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={editForm.is_admin}
                disabled={editTarget.id === currentEmployeeId}
                onChange={(e) => setEditForm((f) => ({ ...f, is_admin: e.target.checked }))}
                className="h-4 w-4 rounded border-line text-moss-500 focus:ring-moss-500/30 disabled:opacity-50"
              />
              Grant admin privileges
              {editTarget.id === currentEmployeeId && (
                <span className="text-xs text-ink2">(can't change your own admin access)</span>
              )}
            </label>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
