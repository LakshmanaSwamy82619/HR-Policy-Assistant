import clsx from "../utils/clsx";

export default function Card({ children, className = "", hover = false, as: Tag = "div", ...props }) {
  return (
    <Tag
      className={clsx(
        "rounded-xl2 border border-line bg-white p-5 shadow-soft",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
