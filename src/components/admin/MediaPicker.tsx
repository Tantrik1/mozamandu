import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, Search, Check, Image as ImageIcon, Loader2, X, FolderOpen } from 'lucide-react';
import { uploadToR2 } from '@/utils/r2Upload';

interface MediaItem {
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
  { value: 'website', label: 'Website & Logo Assets' },
  { value: 'payment_methods', label: 'Payment Methods' },
  { value: 'notice-images', label: 'Notices' },
  { value: 'blog-images', label: 'Blog' },
  { value: 'payment-screenshots', label: 'Payment Screenshots' },
  { value: 'uploads', label: 'General Uploads' },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function MediaPicker({ open, onClose, onSelect, folder, multiple = false }: MediaPickerProps) {
  const [tab, setTab] = useState<string>('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState(folder || '');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) {
      fetchMedia();
      setSelectedItems(new Set());
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
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'Error', description: `${file.name} exceeds 10MB limit`, variant: 'destructive' });
          continue;
        }

        // Optimize and upload
        const { prepareImageForUpload, PRODUCT_COMPRESSION } = await import('@/utils/imageOptimizer');
        const { file: optimizedFile } = await prepareImageForUpload(file, PRODUCT_COMPRESSION);
        const url = await uploadToR2(optimizedFile, folder || 'uploads');

        // If not using multiple select, directly return the uploaded URL
        if (!multiple) {
          onSelect(url);
          onClose();
          toast({ title: 'Uploaded', description: 'Image uploaded and selected' });
          setUploading(false);
          return;
        }
      }

      toast({ title: 'Success', description: `${fileArray.length} image(s) uploaded` });
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
  }, [folder, multiple]);

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
      onSelect(item.url, item);
      onClose();
    }
  };

  const handleUseSelected = () => {
    if (selectedItems.size === 0) return;
    const selectedUrl = Array.from(selectedItems)[0];
    const selectedMedia = media.find(m => m.url === selectedUrl);
    onSelect(selectedUrl, selectedMedia);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Media Library
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="library" className="flex-1">
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 px-6 pb-4 mt-0">
            {/* Filters */}
            <div className="flex gap-2 py-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background min-w-[140px]"
              >
                {FOLDER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : media.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm">No images found</p>
                  <Button variant="link" onClick={() => setTab('upload')} className="mt-2">
                    Upload an image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {media.map((item) => {
                    const isSelected = selectedItems.has(item.url);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleSelect(item)}
                        className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150 hover:shadow-md ${
                          isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.alt_text || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-white rounded-full p-1">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        {/* Hover info */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{item.title || item.filename}</p>
                          <p className="text-white/70 text-[10px]">{formatBytes(item.size_bytes)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with selection */}
            {multiple && selectedItems.size > 0 && (
              <div className="flex items-center justify-between pt-3 border-t shrink-0">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} selected
                </span>
                <Button onClick={handleUseSelected} size="sm">
                  Use Selected
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col px-6 pb-6 mt-0">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 min-h-[300px] ${
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm font-medium">Uploading & optimizing...</p>
                  <p className="text-xs text-muted-foreground mt-1">Converting to WebP for best performance</p>
                </>
              ) : (
                <>
                  <div className="bg-primary/10 rounded-full p-4 mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">Drag & drop images here</p>
                  <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
                  <Badge variant="secondary" className="text-xs">
                    Max 10MB per file • JPG, PNG, WebP
                  </Badge>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
