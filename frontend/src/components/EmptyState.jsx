export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line bg-white/60 px-6 py-14 text-center animate-fadeUp">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-moss-50">
          <Icon className="h-5 w-5 text-moss-500" />
        </div>
      )}
      <h3 className="font-display text-lg font-medium text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
