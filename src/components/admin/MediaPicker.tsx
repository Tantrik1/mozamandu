import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, Search, Check, Image as ImageIcon, Loader2, Link as LinkIcon, FolderOpen, RefreshCw } from 'lucide-react';
import { uploadToR2 } from '@/utils/r2Upload';

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  title: string;
  alt_text: string;
  folder: string;
  size_bytes: number;
  width: number;
  height: number;
  created_at: string;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, mediaItem?: MediaItem) => void;
  folder?: string;
  multiple?: boolean;
}

const FOLDER_OPTIONS = [
  { value: '', label: 'All Folders' },
  { value: 'products', label: 'Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'subcategories', label: 'Subcategories' },
  { value: 'color_variants', label: 'Color Variants' },
  { value: 'hero', label: 'Hero Backgrounds' },
  { value: 'website', label: 'Website Assets' },
  { value: 'logos', label: 'Logos & Favicons' },
  { value: 'payment_methods', label: 'Payment Methods' },
  { value: 'payment-qr-codes', label: 'Payment QR Codes' },
  { value: 'notice-images', label: 'Notices' },
  { value: 'blog-images', label: 'Blog' },
  { value: 'assets', label: 'Theme Assets' },
  { value: 'uploads', label: 'General Uploads' },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function MediaPicker({ open, onClose, onSelect, folder, multiple = false }: MediaPickerProps) {
  const [tab, setTab] = useState<string>('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState(folder || '');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folder !== undefined) {
      setFolderFilter(folder);
    }
  }, [folder]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (folderFilter) params.set('folder', folderFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, folderFilter]);

  const handleSyncR2 = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/media/sync', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        toast({
          title: 'Cloudflare R2 Synced',
          description: `Found ${result.total_r2_files} file(s) in R2 (${result.synced_added} newly registered).`,
        });
        await fetchMedia();
      } else {
        throw new Error('R2 sync request failed');
      }
    } catch (err) {
      toast({
        title: 'Sync Warning',
        description: 'Could not sync R2 bucket, showing local index.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMedia();
      setSelectedItems(new Set());
      setSelectedItem(null);
      setCustomUrl('');
    }
  }, [open, fetchMedia]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const fileArray = Array.from(files);
    
    try {
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          toast({ title: 'Error', description: `${file.name} is not an image`, variant: 'destructive' });
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast({ title: 'Error', description: `${file.name} exceeds 15MB limit`, variant: 'destructive' });
          continue;
        }

        // Optimize and upload to Cloudflare R2
        const { prepareImageForUpload, PRODUCT_COMPRESSION } = await import('@/utils/imageOptimizer');
        const { file: optimizedFile } = await prepareImageForUpload(file, PRODUCT_COMPRESSION);
        const url = await uploadToR2(optimizedFile, folderFilter || folder || 'uploads');

        const newItem: MediaItem = {
          id: `tmp-${Date.now()}`,
          url,
          filename: file.name,
          title: file.name.replace(/\.[^/.]+$/, ''),
          alt_text: file.name,
          folder: folderFilter || folder || 'uploads',
          size_bytes: optimizedFile.size,
          width: 0,
          height: 0,
          created_at: new Date().toISOString()
        };

        if (!multiple) {
          onSelect(url, newItem);
          onClose();
          toast({ title: 'Uploaded', description: 'Image optimized & selected' });
          setUploading(false);
          return;
        }
      }

      toast({ title: 'Success', description: `${fileArray.length} image(s) uploaded to R2` });
      await fetchMedia();
      setTab('library');
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Upload Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  }, [folderFilter, folder, multiple]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const toggleSelect = (item: MediaItem) => {
    if (multiple) {
      setSelectedItems(prev => {
        const next = new Set(prev);
        if (next.has(item.url)) next.delete(item.url);
        else next.add(item.url);
        return next;
      });
    } else {
      setSelectedItem(item);
    }
  };

  const handleConfirmSingle = (item: MediaItem) => {
    onSelect(item.url, item);
    onClose();
  };

  const handleUseSelected = () => {
    if (multiple) {
      if (selectedItems.size === 0) return;
      const selectedUrl = Array.from(selectedItems)[0];
      const selectedMedia = media.find(m => m.url === selectedUrl);
      onSelect(selectedUrl, selectedMedia);
      onClose();
    } else if (selectedItem) {
      onSelect(selectedItem.url, selectedItem);
      onClose();
    }
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelect(customUrl.trim());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ImageIcon className="h-5 w-5 text-primary" />
            Media Library & Assets
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 shrink-0 border-b bg-muted/10">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="library">
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse Library ({media.length})
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </TabsTrigger>
              <TabsTrigger value="url">
                <LinkIcon className="h-4 w-4 mr-2" />
                External URL
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 px-6 pb-4 mt-0 pt-3">
            {/* Filters */}
            <div className="flex gap-2 mb-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images by name or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background min-w-[150px] font-medium"
              >
                {FOLDER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={handleSyncR2} disabled={syncing} className="gap-1.5 font-medium text-xs">
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing R2...' : 'Sync R2 Bucket'}
              </Button>
              <Button variant="outline" size="icon" onClick={fetchMedia} title="Refresh library">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : media.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl my-4">
                  <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No images in this folder</p>
                  <Button variant="link" onClick={() => setTab('upload')} className="mt-1 text-primary">
                    Upload an image now
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 pb-2">
                  {media.map((item) => {
                    const isSelected = multiple
                      ? selectedItems.has(item.url)
                      : selectedItem?.url === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelect(item)}
                        onDoubleClick={() => !multiple && handleConfirmSingle(item)}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 text-left bg-slate-100 ${
                          isSelected ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-slate-200 hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.alt_text || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                          }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/25 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-primary text-white rounded-full p-1.5 shadow-lg">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[11px] font-medium truncate">{item.title || item.filename}</p>
                          <p className="text-white/70 text-[9px]">{formatBytes(item.size_bytes)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer selection actions */}
            <div className="flex items-center justify-between pt-3 border-t shrink-0 mt-2">
              <div className="text-xs text-muted-foreground truncate max-w-[500px]">
                {multiple ? (
                  <span>{selectedItems.size} selected</span>
                ) : selectedItem ? (
                  <span className="font-medium text-foreground">Selected: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{selectedItem.filename}</code> ({formatBytes(selectedItem.size_bytes)})</span>
                ) : (
                  <span>Click an image to select (or double click)</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={handleUseSelected}
                  size="sm"
                  disabled={multiple ? selectedItems.size === 0 : !selectedItem}
                >
                  Select & Insert Image
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col px-6 pb-6 mt-0 pt-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 min-h-[280px] p-6 text-center ${
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm font-semibold">Uploading to R2 CDN & Optimizing...</p>
                  <p className="text-xs text-muted-foreground mt-1">Converting to high-efficiency WebP format</p>
                </>
              ) : (
                <>
                  <div className="bg-primary/10 rounded-full p-4 mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-base font-semibold mb-1">Drag & drop images here</p>
                  <p className="text-xs text-muted-foreground mb-4">or click to browse from device</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Badge variant="secondary" className="text-xs">Automatic WebP Compression</Badge>
                    <Badge variant="secondary" className="text-xs">Cloudflare R2 CDN</Badge>
                    <Badge variant="secondary" className="text-xs">Max 15MB</Badge>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
              className="hidden"
            />
          </TabsContent>

          {/* External URL Tab */}
          <TabsContent value="url" className="flex-1 flex flex-col px-6 pb-6 mt-0 pt-3">
            <form onSubmit={handleCustomUrlSubmit} className="space-y-4 max-w-lg mx-auto w-full my-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium">Paste Image URL</label>
                <Input
                  type="url"
                  placeholder="https://images.mozamandu.com/example.webp"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
                <p className="text-xs text-muted-foreground">Enter a direct HTTPS image URL from R2 or external CDN.</p>
              </div>

              {customUrl && (
                <div className="aspect-video w-full max-h-48 rounded-lg overflow-hidden border bg-slate-100 flex items-center justify-center">
                  <img src={customUrl} alt="Preview" className="max-h-full object-contain" onError={() => toast({ title: 'Invalid Image URL', variant: 'destructive' })} />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={!customUrl.trim()}>Use Image URL</Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default MediaPicker;
