import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative flex flex-col font-sans">
      <div className="noise-overlay" />
      
      {/* Navbar */}
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-foreground">
          <BrandMark className="w-7 h-7" />
          <BrandWordmark className="text-lg" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center max-w-4xl mx-auto w-full relative z-0">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-foreground">
          Bioinformatics,<br/>without the setup.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          Run code directly in your browser. No Docker wrestling, no dependency hell—just pure science.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">Start the Curriculum</Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8">Sign In</Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 text-left">
          <Feature 
            title="Zero Configuration" 
            desc="Every lesson boots up an isolated, pre-configured cloud container in seconds. Focus on the analysis, not the setup."
          />
          <Feature 
            title="Multi-omics Scale" 
            desc="From scRNA Transcriptomics to Multimodal Data Integration. Work with realistic datasets directly in your browser."
          />
          <Feature 
            title="AI Integration" 
            desc="Bring your own API keys to leverage Foundation Models and LLMs directly alongside your data."
          />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground relative z-10">
        <p>© {new Date().getFullYear()} Primer. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Feature({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-6 rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm">
      <h3 className="font-serif text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
