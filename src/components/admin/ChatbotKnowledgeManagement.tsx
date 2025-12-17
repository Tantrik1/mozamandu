import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Bot } from 'lucide-react';

const MAX_KNOWLEDGE_CHARS = 1000;
const SLUG = 'default';

export function ChatbotKnowledgeManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [knowledgeText, setKnowledgeText] = useState('');

  const remaining = useMemo(() => MAX_KNOWLEDGE_CHARS - knowledgeText.length, [knowledgeText]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('chatbot_knowledge')
          .select('knowledge_text')
          .eq('slug', SLUG)
          .maybeSingle();

        if (error) throw error;
        setKnowledgeText(data?.knowledge_text ?? '');
      } catch (e: any) {
        console.error('Failed to load chatbot knowledge:', e);
        toast({
          title: 'Error',
          description: 'Failed to load chatbot knowledge',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    if (knowledgeText.length > MAX_KNOWLEDGE_CHARS) {
      toast({
        title: 'Error',
        description: `Knowledge must be ${MAX_KNOWLEDGE_CHARS} characters or less`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('chatbot_knowledge')
        .upsert(
          {
            slug: SLUG,
            knowledge_text: knowledgeText,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Chatbot knowledge updated successfully',
      });
    } catch (e: any) {
      console.error('Failed to save chatbot knowledge:', e);
      toast({
        title: 'Error',
        description: e?.message || 'Failed to save chatbot knowledge',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chatbot Knowledge</h1>
        <p className="text-muted-foreground">
          Add business-specific information the chatbot should follow before answering. Limit: {MAX_KNOWLEDGE_CHARS} characters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Knowledge Base (Single Text)
          </CardTitle>
          <CardDescription>
            This text is included in the chatbot prompt. Keep it clear and concise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knowledge_text">Knowledge</Label>
            <Textarea
              id="knowledge_text"
              value={knowledgeText}
              onChange={(e) => setKnowledgeText(e.target.value.slice(0, MAX_KNOWLEDGE_CHARS))}
              maxLength={MAX_KNOWLEDGE_CHARS}
              rows={10}
              placeholder="Example: Our delivery takes 2-4 days inside Nepal. Cash on Delivery available in Kathmandu valley..."
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                The chatbot will use this as a strict instruction if possible.
              </p>
              <p className="text-xs text-muted-foreground">{remaining} characters left</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Knowledge
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
