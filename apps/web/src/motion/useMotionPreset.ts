import { useMemo } from "react";

export function useMotionPreset() {
  return useMemo(
    () => ({
      initial: { opacity: 0, transform: "translateY(12px)" },
      animate: { opacity: 1, transform: "translateY(0)" },
      transition: { duration: "var(--motion-medium)", easing: "var(--motion-ease)" }
    }),
    []
  );
}
