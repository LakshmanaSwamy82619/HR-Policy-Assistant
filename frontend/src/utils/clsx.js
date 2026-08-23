// Tiny classnames joiner — avoids pulling in a dependency for one function.
export default function clsx(...args) {
  return args
    .flat()
    .filter(Boolean)
    .join(" ");
}
