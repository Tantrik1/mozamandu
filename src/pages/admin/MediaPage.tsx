import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  FolderOpen, 
  Home, 
  Globe, 
  Search, 
  Trash2, 
  Edit3, 
  Save, 
  HardDrive, 
  ImageIcon, 
  Check, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';

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
  usage_count?: number;
}

interface StorageStats {
  total_files: number;
  total_bytes: number;
  total_mb: number;
  total_gb: number;
  limit_gb: number;
  limit_bytes: number;
  usage_percent: number;
  by_folder?: Array<{ folder: string; count: number; bytes: number }>;
}

export function MediaPage() {
  const [activeTab, setActiveTab] = useState('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StorageStats | null>(null);
  
  // Library filters & search
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);

  // Selected item for detail/editing & renaming in R2
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editFilename, setEditFilename] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [syncingR2, setSyncingR2] = useState(false);

  // MediaPicker dialog states
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'hero' | 'logo_header' | 'logo_footer' | 'favicon' | null>(null);

  // Home page settings
  const [heroBg, setHeroBg] = useState('https://images.mozamandu.com/hero-background.webp');
  const [heroTitle, setHeroTitle] = useState('Welcome To Mozamandu');
  const [heroSubheading, setHeroSubheading] = useState('Premium socks, boxers & essentials designed for everyday comfort and style.');

  // Website settings
  const [logoHeader, setLogoHeader] = useState('/lovable-uploads/c5be09dc-3446-4e71-9d5a-482531992782.jpg');
  const [logoFooter, setLogoFooter] = useState('/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png');
  const [favicon, setFavicon] = useState('/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png');

  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchMedia();
    fetchStats();
    fetchSiteSettings();
  }, [search, folderFilter, showOnlyUnused]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (folderFilter) params.set('folder', folderFilter);
      if (showOnlyUnused) params.set('unused', 'true');
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
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/media/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch('/api/site-settings');
      if (res.ok) {
        const settings = await res.json();
        if (settings.hero_background?.value) setHeroBg(settings.hero_background.value);
        if (settings.hero_background?.metadata?.heading) setHeroTitle(settings.hero_background.metadata.heading);
        if (settings.hero_background?.metadata?.subheading) setHeroSubheading(settings.hero_background.metadata.subheading);
        if (settings.logo_header?.value) setLogoHeader(settings.logo_header.value);
        if (settings.logo_footer?.value) setLogoFooter(settings.logo_footer.value);
        if (settings.favicon?.value) setFavicon(settings.favicon.value);
      }
    } catch (err) {
      console.error('Failed to fetch site settings:', err);
    }
  };

  const handleSyncR2 = async () => {
    setSyncingR2(true);
    try {
      const res = await fetch('/api/media/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Cloudflare R2 Synced!',
          description: `Synced ${data.total_r2_files} file(s) from bucket. Added ${data.synced_added} new items.`,
        });
        fetchMedia();
        fetchStats();
      } else {
        throw new Error('R2 sync failed');
      }
    } catch (err) {
      toast({ title: 'Sync Error', description: 'Failed to sync with Cloudflare R2 bucket', variant: 'destructive' });
    } finally {
      setSyncingR2(false);
    }
  };

  const handleSaveMetaAndRename = async () => {
    if (!editingItem) return;
    setIsSavingMeta(true);
    try {
      const res = await fetch(`/api/media/${editingItem.id}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_filename: editFilename,
          new_folder: editFolder,
          title: editTitle,
          alt_text: editAlt,
        }),
      });
      if (res.ok) {
        toast({ title: 'Updated & Renamed!', description: 'Cloudflare R2 key & database updated' });
        setEditingItem(null);
        fetchMedia();
        fetchStats();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update item');
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update', variant: 'destructive' });
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    let confirmMsg = 'Are you sure you want to delete this media item from Cloudflare R2 bucket?';
    if (item.usage_count && item.usage_count > 0) {
      confirmMsg = `⚠️ WARNING: This image is currently IN USE by ${item.usage_count} item(s) on your store!\n\nDeleting this image will remove the photo from those live products or categories.\n\nAre you sure you want to permanently delete it?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Image deleted from Cloudflare R2 and database' });
        fetchMedia();
        fetchStats();
      } else {
        const err = await res.json();
        toast({ title: 'Delete Failed', description: err.error || 'Could not delete image', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' });
    }
  };

  const handleSaveHero = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/site-settings/hero_background', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: heroBg,
          metadata: { heading: heroTitle, subheading: heroSubheading, alt_text: 'Mozamandu Hero Background' }
        })
      });
      toast({ title: 'Saved!', description: 'Home Page Hero Section updated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingSettings(true);
    try {
      await Promise.all([
        fetch('/api/site-settings/logo_header', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: logoHeader, metadata: { alt_text: 'Mozamandu Header Logo' } })
        }),
        fetch('/api/site-settings/logo_footer', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: logoFooter, metadata: { alt_text: 'Mozamandu Footer Logo' } })
        }),
        fetch('/api/site-settings/favicon', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: favicon, metadata: { alt_text: 'Mozamandu Favicon' } })
        })
      ]);
      toast({ title: 'Saved!', description: 'Website branding settings updated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save branding', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePickerSelect = (url: string) => {
    if (pickerTarget === 'hero') setHeroBg(url);
    if (pickerTarget === 'logo_header') setLogoHeader(url);
    if (pickerTarget === 'logo_footer') setLogoFooter(url);
    if (pickerTarget === 'favicon') setFavicon(url);
    setPickerTarget(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header & Storage Meter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-8 w-8 text-primary" />
            Media & Asset Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Centralized media library, SEO asset metadata, homepage hero & brand controls.
          </p>
        </div>

        {/* 10GB Storage Capacity Bar */}
        <Card className="w-full md:w-80 shadow-sm border bg-slate-50/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="flex items-center gap-1.5 text-slate-700">
                <HardDrive className="h-3.5 w-3.5 text-primary" />
                Cloudflare R2 Storage
              </span>
              <span className="text-slate-600">
                {stats ? `${stats.total_mb} MB / ${stats.limit_gb} GB` : 'Loading...'}
              </span>
            </div>
            <Progress value={stats ? stats.usage_percent : 0} className="h-2" />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
              <span>{stats ? `${stats.total_files} files` : '0 files'}</span>
              <span>{stats ? `${stats.usage_percent}% used` : '0%'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="home" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home Page
          </TabsTrigger>
          <TabsTrigger value="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Website
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Library
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HOME PAGE HERO SECTION CONTROLS */}
        <TabsContent value="home">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Hero Section Controls
              </CardTitle>
              <CardDescription>
                Customize your homepage main hero background image, title, and subheading text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview Box */}
              <div className="relative rounded-xl overflow-hidden border shadow-inner aspect-[16/6] bg-slate-900 flex items-center justify-center text-center p-6">
                <img
                  src={heroBg}
                  alt="Hero Preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-75"
                />
                <div className="relative z-10 bg-white/20 backdrop-blur-md p-6 rounded-xl border border-white/30 max-w-lg mx-auto">
                  <h2 className="text-2xl font-bold text-white mb-2">{heroTitle}</h2>
                  <p className="text-white/90 text-sm">{heroSubheading}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Hero Background Image</Label>
                  <div className="flex gap-2">
                    <Input value={heroBg} onChange={(e) => setHeroBg(e.target.value)} className="font-mono text-xs" />
                    <Button onClick={() => { setPickerTarget('hero'); setPickerOpen(true); }} variant="secondary">
                      Choose
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hero Heading Title</Label>
                  <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Hero Subheading</Label>
                  <Textarea value={heroSubheading} onChange={(e) => setHeroSubheading(e.target.value)} rows={3} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveHero} disabled={savingSettings} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Home Page Hero Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: WEBSITE BRANDING CONTROLS */}
        <TabsContent value="website">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Website Branding Assets
              </CardTitle>
              <CardDescription>
                Manage header logo, footer logo, and site favicon. Assets are stored in R2 CDN.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Header Logo */}
                <div className="border rounded-lg p-4 space-y-3 bg-card">
                  <Label className="font-semibold text-sm">Header Logo</Label>
                  <div className="h-24 rounded border flex items-center justify-center p-2 bg-slate-50">
                    <img src={logoHeader} alt="Header Logo" className="max-h-full object-contain" />
                  </div>
                  <Input value={logoHeader} onChange={(e) => setLogoHeader(e.target.value)} className="font-mono text-xs" />
                  <Button onClick={() => { setPickerTarget('logo_header'); setPickerOpen(true); }} variant="outline" className="w-full">
                    Change Header Logo
                  </Button>
                </div>

                {/* Footer Logo */}
                <div className="border rounded-lg p-4 space-y-3 bg-card">
                  <Label className="font-semibold text-sm">Footer Logo</Label>
                  <div className="h-24 rounded border flex items-center justify-center p-2 bg-slate-900">
                    <img src={logoFooter} alt="Footer Logo" className="max-h-full object-contain" />
                  </div>
                  <Input value={logoFooter} onChange={(e) => setLogoFooter(e.target.value)} className="font-mono text-xs" />
                  <Button onClick={() => { setPickerTarget('logo_footer'); setPickerOpen(true); }} variant="outline" className="w-full">
                    Change Footer Logo
                  </Button>
                </div>

                {/* Favicon */}
                <div className="border rounded-lg p-4 space-y-3 bg-card">
                  <Label className="font-semibold text-sm">Site Favicon</Label>
                  <div className="h-24 rounded border flex items-center justify-center p-2 bg-slate-50">
                    <img src={favicon} alt="Favicon" className="h-10 w-10 object-contain" />
                  </div>
                  <Input value={favicon} onChange={(e) => setFavicon(e.target.value)} className="font-mono text-xs" />
                  <Button onClick={() => { setPickerTarget('favicon'); setPickerOpen(true); }} variant="outline" className="w-full">
                    Change Favicon
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveBranding} disabled={savingSettings} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Website Branding Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MEDIA LIBRARY MANAGEMENT */}
        <TabsContent value="library">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Cloudflare R2 Media Library</CardTitle>
                <CardDescription>
                  Browse all images, edit R2 file keys, manage SEO titles & alt tags, delete unused files.
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleSyncR2}
                  disabled={syncingR2}
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <RefreshCw className={`h-4 w-4 ${syncingR2 ? 'animate-spin' : ''}`} />
                  {syncingR2 ? 'Syncing R2...' : 'Sync Cloudflare R2'}
                </Button>
                <Button onClick={() => { setPickerTarget(null); setPickerOpen(true); }} className="gap-2 flex-1 sm:flex-initial">
                  <ImageIcon className="h-4 w-4" />
                  Upload New Media
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, filename, or alt text..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm bg-background font-medium"
                >
                  <option value="">All Folders</option>
                  <option value="products">Products</option>
                  <option value="categories">Categories</option>
                  <option value="subcategories">Subcategories</option>
                  <option value="color_variants">Color Variants</option>
                  <option value="hero">Hero Backgrounds</option>
                  <option value="website">Website Assets</option>
                  <option value="logos">Logos & Favicons</option>
                  <option value="payment_methods">Payment Methods</option>
                  <option value="payment-qr-codes">Payment QR Codes</option>
                  <option value="notice-images">Notices</option>
                  <option value="blog-images">Blog</option>
                  <option value="assets">Theme Assets</option>
                  <option value="uploads">General Uploads</option>
                </select>

                <Button
                  variant={showOnlyUnused ? 'destructive' : 'outline'}
                  onClick={() => setShowOnlyUnused(!showOnlyUnused)}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {showOnlyUnused ? 'Showing Unused Images' : 'Filter Unused'}
                </Button>
              </div>

              {/* Grid of Media */}
              {loading ? (
                <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Loading media items...
                </div>
              ) : media.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">No media found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or click "Sync Cloudflare R2".</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className="group relative border rounded-lg overflow-hidden bg-card transition-all hover:shadow-md flex flex-col"
                    >
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img
                          src={item.url}
                          alt={item.alt_text || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          {item.usage_count !== undefined && item.usage_count > 0 ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/90 text-white">
                              Used ({item.usage_count})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/90 text-white border-none">
                              Unused
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-2 space-y-1 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-medium truncate" title={item.title || item.filename}>
                            {item.title || item.filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {item.folder} • {(item.size_bytes / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t mt-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingItem(item);
                              setEditTitle(item.title || '');
                              setEditAlt(item.alt_text || '');
                              setEditFilename(item.filename || '');
                              setEditFolder(item.folder || 'uploads');
                            }}
                            title="Edit SEO & Rename R2 File"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              navigator.clipboard.writeText(item.url);
                              toast({ title: 'URL Copied', description: 'CDN URL copied to clipboard' });
                            }}
                            title="Copy Public R2 CDN URL"
                          >
                            <Check className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground p-1"
                            title="Open full size"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteMedia(item)}
                            title="Delete image from R2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advanced R2 File Editing & Renaming Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-background shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Edit & Rename R2 Bucket Image
              </CardTitle>
              <CardDescription className="truncate font-mono text-xs text-muted-foreground">
                {editingItem.url}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-36 rounded-lg border overflow-hidden bg-slate-100 flex items-center justify-center p-2">
                <img src={editingItem.url} alt="Preview" className="max-h-full object-contain" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Folder Category</Label>
                  <select
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-xs bg-background font-medium"
                  >
                    <option value="products">Products</option>
                    <option value="categories">Categories</option>
                    <option value="subcategories">Subcategories</option>
                    <option value="color_variants">Color Variants</option>
                    <option value="hero">Hero Backgrounds</option>
                    <option value="website">Website Assets</option>
                    <option value="logos">Logos & Favicons</option>
                    <option value="payment_methods">Payment Methods</option>
                    <option value="payment-qr-codes">Payment QR Codes</option>
                    <option value="notice-images">Notices</option>
                    <option value="blog-images">Blog</option>
                    <option value="assets">Theme Assets</option>
                    <option value="uploads">General Uploads</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">R2 Filename</Label>
                  <Input
                    value={editFilename}
                    onChange={(e) => setEditFilename(e.target.value)}
                    placeholder="my-image.webp"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SEO Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Display / Search Title" className="text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SEO Alt Text</Label>
                <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} placeholder="Alt text for search engines & screen readers" className="text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button onClick={handleSaveMetaAndRename} disabled={isSavingMeta} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save & Rename R2 Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
