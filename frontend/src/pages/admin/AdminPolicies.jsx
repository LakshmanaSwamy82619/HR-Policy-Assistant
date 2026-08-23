import { useEffect, useRef, useState } from "react";
import { FileStack, Upload, RefreshCcw, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { listPolicyDocuments, uploadPolicyDocument } from "../../services/adminService";

export default function AdminPolicies() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "" });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    listPolicyDocuments()
      .then(setDocuments)
      .catch((err) => toast.error(err.message || "Couldn't load policy documents"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setForm({ title: "", category: "" });
    setFile(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Give the document a title";
    if (!form.category.trim()) next.category = "Assign a category, e.g. Leave, Benefits";
    if (!file) next.file = "Choose a file to ingest";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await uploadPolicyDocument({ title: form.title, category: form.category, file });
      toast.success(`Ingested ${result.chunks_created} section chunk${result.chunks_created === 1 ? "" : "s"}`);
      setModalOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.message || "Ingestion failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-medium text-ink">Policy documents</h1>
              <p className="mt-1.5 text-sm text-ink2">
                Section-aware ingestion powers the assistant's cited answers.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={RefreshCcw} onClick={load}>
                Refresh
              </Button>
              <Button size="sm" icon={Upload} onClick={() => setModalOpen(true)}>
                Ingest document
              </Button>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          )}

          {!loading && documents.length === 0 && (
            <EmptyState
              icon={FileStack}
              title="No documents yet"
              description="Upload your first policy document to start building the assistant's knowledge base."
              action={
                <Button icon={Upload} onClick={() => setModalOpen(true)}>
                  Upload document
                </Button>
              }
            />
          )}

          {!loading && documents.length > 0 && (
            <div className="grid animate-fadeUp grid-cols-1 gap-3 sm:grid-cols-2">
              {documents.map((d) => (
                <Card key={d.id} hover>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-moss-50 text-moss-500">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{d.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone="moss">{d.category}</Badge>
                        <Badge tone="neutral">v{d.version}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Ingest a policy document"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={submitting} icon={Upload}>
              Ingest
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. Paid Time Off Policy"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            error={errors.title}
          />
          <Input
            label="Category"
            placeholder="e.g. Leave, Benefits, Compliance"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            error={errors.category}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Document file</label>
            <label
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-paper-dim ${
                errors.file ? "border-danger" : "border-line"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <span className="flex items-center gap-2 text-sm text-ink">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {file.name}
                </span>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-ink2" />
                  <span className="text-sm text-ink2">Click to choose a file</span>
                </>
              )}
            </label>
            {errors.file && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-danger">
                <AlertCircle className="h-3 w-3" /> {errors.file}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
