"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: "font-sans w-[min(100%,22rem)]",
        },
      }}
    />
  );
}
