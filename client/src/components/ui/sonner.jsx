"use client"

// WARNING: This component uses 'next-themes', which is a Next.js library.
// It will cause an error in a Create React App project.
// You must replace `useTheme` with your own theme context or state management solution.
import { useTheme } from "next-themes" 
import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  // This line will fail in CRA. You need to provide your own `theme` variable.
  const { theme = "system" } = useTheme() 

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }