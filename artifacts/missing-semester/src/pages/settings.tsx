import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListApiKeys, useUpsertApiKey, useDeleteApiKey } from "@workspace/api-client-react";
import { KeyRound, CheckCircle2, Trash2, Key } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const SERVICES = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Required for Foundation Models and LLM integration tasks.",
    guide: "Get your key from platform.openai.com/api-keys",
  },
  {
    id: "pinecone",
    name: "Pinecone",
    description: "Required for vector database and semantic search tasks.",
    guide: "Get your key from app.pinecone.io",
  }
];

export default function Settings() {
  const { data: apiKeys, refetch } = useListApiKeys();
  const upsertKey = useUpsertApiKey();
  const deleteKey = useDeleteApiKey();
  const { toast } = useToast();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const handleSave = (service: string) => {
    const key = inputValues[service];
    if (!key) return;

    upsertKey.mutate(
      { service, data: { key } },
      {
        onSuccess: () => {
          toast({ title: "Key saved successfully" });
          setInputValues(prev => ({ ...prev, [service]: "" }));
          refetch();
        },
        onError: () => {
          toast({ title: "Failed to save key", variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (service: string) => {
    deleteKey.mutate(
      { service },
      {
        onSuccess: () => {
          toast({ title: "Key removed" });
          refetch();
        }
      }
    );
  };

  const getKeyForService = (service: string) => {
    return apiKeys?.find(k => k.service === service);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground mb-2">Settings & Integrations</h1>
        <p className="text-muted-foreground">Manage your personal API keys for advanced curriculum modules.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium flex items-center gap-2 mb-4">
            <KeyRound size={20} className="text-primary" />
            API Keys
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Keys are stored securely and only injected into your active container sessions. 
            They are never logged or exposed in the UI.
          </p>
        </div>

        {SERVICES.map((service) => {
          const existingKey = getKeyForService(service.id);
          
          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {service.name}
                      {existingKey && (
                        <Badge variant="success" className="h-5 text-[10px] px-1.5 flex gap-1">
                          <CheckCircle2 size={10} /> Configured
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{service.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {existingKey ? (
                  <div className="bg-muted/50 border rounded-md p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key size={16} className="text-muted-foreground" />
                      <code className="font-mono text-sm font-medium">{existingKey.maskedKey}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(service.id)}
                      disabled={deleteKey.isPending}
                    >
                      <Trash2 size={16} className="mr-2" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Input 
                      type="password" 
                      placeholder="Paste your API key here..." 
                      className="font-mono"
                      value={inputValues[service.id] || ""}
                      onChange={(e) => setInputValues(prev => ({ ...prev, [service.id]: e.target.value }))}
                    />
                    <Button 
                      onClick={() => handleSave(service.id)}
                      disabled={!inputValues[service.id] || upsertKey.isPending}
                    >
                      {upsertKey.isPending ? "Saving..." : "Save Key"}
                    </Button>
                  </div>
                )}
              </CardContent>
              {!existingKey && (
                <CardFooter className="bg-muted/30 border-t py-3 px-6 text-xs text-muted-foreground">
                  <span className="font-medium mr-1">Hint:</span> {service.guide}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
