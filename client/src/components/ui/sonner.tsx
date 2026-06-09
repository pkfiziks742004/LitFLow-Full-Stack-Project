import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      expand={false}
      gap={12}
      visibleToasts={4}
      offset={{ top: 94, right: 20 }}
      mobileOffset={{ top: 82, right: 14, left: 14 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group pointer-events-auto flex w-[min(420px,calc(100vw-1.5rem))] items-start gap-3 rounded-[22px] border border-slate-200/90 bg-white px-4 py-3.5 text-slate-950 shadow-[0_22px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/[0.04]",
          content: "grid min-w-0 gap-1 pt-0.5",
          title: "text-[14px] font-semibold leading-5 text-slate-950",
          description: "text-[13px] leading-5 text-slate-500",
          icon:
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm",
          success: "border-emerald-100 bg-white",
          error: "border-rose-100 bg-white",
          warning: "border-amber-100 bg-white",
          info: "border-sky-100 bg-white",
          loading: "border-slate-200 bg-white",
          closeButton:
            "rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-600",
          actionButton:
            "rounded-full bg-slate-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800",
          cancelButton:
            "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-sky-600" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-rose-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-slate-600" />,
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "rgba(226,232,240,0.92)",
          "--border-radius": "1.35rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
