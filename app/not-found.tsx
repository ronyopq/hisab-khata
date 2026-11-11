import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-4xl font-bold">404</h1><p className="text-muted-foreground">Page not found</p><Link href="/dashboard"><Button>Go Home</Button></Link></div>;
}
