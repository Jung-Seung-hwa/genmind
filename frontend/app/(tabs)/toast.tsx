"use client";

import * as React from "react";
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cn } from "@/app/lib/utils";

export type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>;
export type ToastActionElement = React.ReactNode;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn("rounded-md shadow-md", className)}
    {...props}
  />
));
Toast.displayName = "Toast";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn("fixed bottom-0 right-0 m-4 w-96 max-w-[100vw]", className)}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const ToastTitle = ToastPrimitives.Title;
const ToastDescription = ToastPrimitives.Description;
const ToastAction = ToastPrimitives.Action;
const ToastClose = ToastPrimitives.Close;

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
};
