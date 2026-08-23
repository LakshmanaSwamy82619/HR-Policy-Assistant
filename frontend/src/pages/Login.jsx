import { useEffect, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, FileStack, BookMarked, ShieldCheck, Users2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Input from "../components/Input";
import Button from "../components/Button";

// A short looping "live demo" of the assistant answering, purely
// presentational - gives the login screen a sense of motion/video without
// shipping an actual video file. Cycles automatically; no user data.
const DEMO_EXCHANGES = [
  {
    q: "How many vacation days do I have left?",
    a: "You have 14 days remaining this year, pulled live from your HR record.",
    tag: "HRIS lookup",
  },
  {
    q: "What's the policy on remote work?",
    a: "Employees may work remotely up to 3 days/week, per Section 4.2 of the Remote Work Policy.",
    tag: "Policy · cited",
  },
  {
    q: "I want to report an issue with my manager.",
    a: "This is sensitive, so I've routed it directly to a human HR representative.",
    tag: "Escalated to HR",
  },
];

function LiveDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("question"); // question -> answer -> hold

  useEffect(() => {
    const timers = [];
    if (phase === "question") {
      timers.push(setTimeout(() => setPhase("answer"), 1400));
    } else if (phase === "answer") {
      timers.push(setTimeout(() => setPhase("hold"), 2200));
    } else {
      timers.push(
        setTimeout(() => {
          setIndex((i) => (i + 1) % DEMO_EXCHANGES.length);
          setPhase("question");
        }, 1600)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const current = DEMO_EXCHANGES[index];

  return (
    <div className="relative flex min-h-[132px] flex-col gap-2.5">
      <motion.div
        key={`q-${index}`}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-white/10 px-3.5 py-2 text-[13px] text-paper/90"
      >
        {current.q}
      </motion.div>

      <AnimatePresence mode="wait">
        {(phase === "answer" || phase === "hold") && (
          <motion.div
            key={`a-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex max-w-[90%] flex-col gap-1.5 rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-moss-400">
              <Sparkles className="h-3 w-3" />
              {current.tag}
            </div>
            <p className="text-[13px] leading-relaxed text-paper/80">{current.a}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "question" && (
        <div className="flex max-w-[90%] items-center gap-1.5 rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2.5">
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-moss-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-moss-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-moss-400 [animation-delay:300ms]" />
        </div>
      )}
    </div>
  );
}

export default function Login() {
  const { login, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (ready && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || "/chat"} replace />;
  }

  const validate = () => {
    const next = {};
    if (!email) next.email = "Enter your work email";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/chat", { replace: true });
    } catch (err) {
      toast.error(err.message || "Couldn't sign you in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel - animated "video-like" background: drifting gradient
          orbs, a faint moving grid, and a looping live-demo chat preview. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-10 text-paper lg:flex">
        {/* Drifting gradient orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 animate-drift rounded-full bg-moss-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 animate-driftSlow rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 h-64 w-64 animate-driftSlow rounded-full bg-moss-400/10 blur-3xl [animation-delay:-6s]" />

        {/* Faint moving grid, like a subtle video texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        {/* A few slow-floating particles for extra life */}
        {[
          { top: "18%", left: "72%", delay: "0s", size: "h-1.5 w-1.5" },
          { top: "62%", left: "85%", delay: "-2s", size: "h-1 w-1" },
          { top: "40%", left: "60%", delay: "-4s", size: "h-2 w-2" },
          { top: "78%", left: "30%", delay: "-1s", size: "h-1 w-1" },
        ].map((p, i) => (
          <span
            key={i}
            className={`pointer-events-none absolute animate-floatSlow rounded-full bg-moss-300/40 ${p.size}`}
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-moss-500">
            <FileStack className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-display text-lg font-medium">HR Policy Assistant</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md"
        >
          <p className="font-display text-[2.35rem] font-medium leading-[1.15] text-paper">
            Every policy answer, <span className="text-moss-400">traced to its section.</span>
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-paper/55">
            Ask about leave, benefits, or reimbursement in plain language. Personal questions pull
            live from your HR record; anything sensitive goes straight to a human.
          </p>

          <div className="mt-7 rounded-xl2 border border-white/10 bg-white/[0.04] p-4">
            <LiveDemo />
          </div>

          <motion.div
            className="mt-8 flex flex-col gap-4"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } }}
          >
            {[
              { icon: BookMarked, text: "Cited answers grounded in policy sections" },
              { icon: ShieldCheck, text: "Sensitive topics always reach a human rep" },
              { icon: Users2, text: "Personal data scoped strictly to you" },
            ].map(({ icon: Icon, text }) => (
              <motion.div
                key={text}
                variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                className="flex items-center gap-3 text-sm text-paper/70"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Icon className="h-4 w-4 text-moss-400" />
                </span>
                {text}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <p className="relative text-xs text-paper/30">Internal tool &middot; Access limited to verified employees</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-moss-500">
              <FileStack className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-base font-medium text-ink">HR Policy Assistant</span>
          </div>

          <h1 className="font-display text-2xl font-medium text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-ink2">Use your work email to reach your HR assistant.</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4" noValidate>
            <Input
              label="Work email"
              type="email"
              name="email"
              icon={Mail}
              autoComplete="email"
              placeholder="jane.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <Input
              label="Password"
              type="password"
              name="password"
              icon={Lock}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <Button type="submit" loading={loading} className="mt-2 w-full" size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-ink2/70">
            Account provisioning is handled by your HR admin, not self-service registration.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
