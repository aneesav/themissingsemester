import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background relative flex flex-col font-sans">
      <div className="noise-overlay" />
      <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center max-w-4xl mx-auto w-full relative z-0">
        
        <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-foreground">
          404
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">Return Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
