import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import Button from "../components/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-paper">
        <FileQuestion className="h-6 w-6" />
      </div>
      <h1 className="font-display text-3xl font-medium text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink2">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/chat" className="mt-6">
        <Button>Back to the assistant</Button>
      </Link>
    </div>
  );
}
