export function AdminContainer({ children }: { children: React.ReactNode }) {
  // w-full is required because this is a flex item inside `main.flex.flex-col`
  // (admin layout): without it, the mx-auto margins shrink-wrap the container
  // to its content width and center it instead of spanning max-w-5xl.
  return (
    <div className="mx-auto w-full max-w-5xl pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
