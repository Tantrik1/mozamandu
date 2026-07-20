import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles, Search, X } from 'lucide-react';

interface ProductSEOSectionProps {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  productName: string;
  productDescription: string;
  sellingPrice: number;
  categoryName?: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onMetaKeywordsChange: (value: string) => void;
  onOgTitleChange: (value: string) => void;
  onOgDescriptionChange: (value: string) => void;
}

export function ProductSEOSection({
  metaTitle,
  metaDescription,
  metaKeywords,
  ogTitle,
  ogDescription,
  productName,
  productDescription,
  sellingPrice,
  categoryName,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onMetaKeywordsChange,
  onOgTitleChange,
  onOgDescriptionChange,
}: ProductSEOSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Character limits
  const META_TITLE_MAX = 60;
  const META_DESC_MAX = 160;

  // Auto-generate helpers
  const generateMetaTitle = () => {
    const title = `${productName}${categoryName ? ` - ${categoryName}` : ''} | Buy at Mozamandu Nepal`;
    onMetaTitleChange(title.slice(0, META_TITLE_MAX));
  };

  const generateMetaDescription = () => {
    const cleanDescription = productDescription?.replace(/<[^>]*>/g, '').slice(0, 80) || '';
    const priceText = sellingPrice > 0 ? `Rs. ${sellingPrice}` : '';
    const desc = `Buy ${productName}${priceText ? ` at ${priceText}` : ''}. ${cleanDescription}${cleanDescription.length >= 80 ? '...' : ''} Shop now at Mozamandu Nepal.`;
    onMetaDescriptionChange(desc.slice(0, META_DESC_MAX));
  };

  const generateKeywords = () => {
    const keywords = [
      productName?.toLowerCase(),
      categoryName?.toLowerCase(),
      'buy online',
      'nepal',
      'mozamandu',
      'best price',
    ].filter(Boolean).join(', ');
    onMetaKeywordsChange(keywords);
  };

  const generateOgTitle = () => {
    onOgTitleChange(metaTitle || `${productName} | Mozamandu`);
  };

  const generateOgDescription = () => {
    onOgDescriptionChange(metaDescription || `Shop ${productName} at the best price. Free delivery available.`);
  };

  // Parse keywords into tags
  const keywordTags = metaKeywords
    ? metaKeywords.split(',').map(k => k.trim()).filter(Boolean)
    : [];

  const removeKeyword = (keyword: string) => {
    const updated = keywordTags.filter(k => k !== keyword).join(', ');
    onMetaKeywordsChange(updated);
  };

  const getCharacterColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio < 0.7) return 'text-muted-foreground';
    if (ratio < 0.9) return 'text-yellow-600';
    return 'text-destructive';
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">SEO Settings</CardTitle>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Google Search Preview */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Google Search Preview</p>
              <div className="space-y-1">
                <p className="text-lg text-blue-600 hover:underline cursor-pointer truncate">
                  {metaTitle || productName || 'Product Title'}
                </p>
                <p className="text-sm text-green-700 truncate">
                  mozamandu.com/product/...
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {metaDescription || productDescription?.slice(0, 160) || 'Product description will appear here...'}
                </p>
              </div>
            </div>

            {/* Meta Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta_title">Meta Title</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${getCharacterColor(metaTitle.length, META_TITLE_MAX)}`}>
                    {metaTitle.length}/{META_TITLE_MAX}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateMetaTitle}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto
                  </Button>
                </div>
              </div>
              <Input
                id="meta_title"
                value={metaTitle}
                onChange={(e) => onMetaTitleChange(e.target.value)}
                placeholder="SEO title for search engines (50-60 characters ideal)"
                maxLength={META_TITLE_MAX}
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta_description">Meta Description</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${getCharacterColor(metaDescription.length, META_DESC_MAX)}`}>
                    {metaDescription.length}/{META_DESC_MAX}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateMetaDescription}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto
                  </Button>
                </div>
              </div>
              <Textarea
                id="meta_description"
                value={metaDescription}
                onChange={(e) => onMetaDescriptionChange(e.target.value)}
                placeholder="SEO description for search engines (150-160 characters ideal)"
                maxLength={META_DESC_MAX}
                rows={3}
              />
            </div>

            {/* Meta Keywords */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateKeywords}
                  className="h-7 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Auto
                </Button>
              </div>
              <Input
                id="meta_keywords"
                value={metaKeywords}
                onChange={(e) => onMetaKeywordsChange(e.target.value)}
                placeholder="Comma-separated keywords (e.g., socks, cotton socks, nepal)"
              />
              {keywordTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {keywordTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeKeyword(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Open Graph Settings */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Social Sharing (Open Graph)</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="og_title">OG Title</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateOgTitle}
                      className="h-7 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Copy Meta
                    </Button>
                  </div>
                  <Input
                    id="og_title"
                    value={ogTitle}
                    onChange={(e) => onOgTitleChange(e.target.value)}
                    placeholder="Title for Facebook/Twitter shares"
                    maxLength={60}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="og_description">OG Description</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateOgDescription}
                      className="h-7 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Copy Meta
                    </Button>
                  </div>
                  <Input
                    id="og_description"
                    value={ogDescription}
                    onChange={(e) => onOgDescriptionChange(e.target.value)}
                    placeholder="Description for social shares"
                    maxLength={160}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Tip: Leave blank to use auto-generated values based on product info. Good SEO helps your products appear in Google, ChatGPT, and other AI search results.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
