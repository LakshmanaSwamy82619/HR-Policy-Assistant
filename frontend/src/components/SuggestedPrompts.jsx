import { CalendarDays, HeartPulse, Receipt, ShieldQuestion } from "lucide-react";

const prompts = [
  { icon: CalendarDays, text: "How many vacation days do I have left this year?" },
  { icon: Receipt, text: "What's the process for expense reimbursement?" },
  { icon: HeartPulse, text: "What does our health benefits plan cover?" },
  { icon: ShieldQuestion, text: "What's the policy on remote work eligibility?" },
];

export default function SuggestedPrompts({ onPick }) {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
      {prompts.map(({ icon: Icon, text }) => (
        <button
          key={text}
          onClick={() => onPick(text)}
          className="group flex items-start gap-3 rounded-xl2 border border-line bg-white p-4 text-left text-sm text-ink2 shadow-soft transition-all hover:-translate-y-0.5 hover:border-moss-500/30 hover:text-ink hover:shadow-lift"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-50 text-moss-500 transition-colors group-hover:bg-moss-500 group-hover:text-white">
            <Icon className="h-4 w-4" />
          </span>
          {text}
        </button>
      ))}
    </div>
  );
}
