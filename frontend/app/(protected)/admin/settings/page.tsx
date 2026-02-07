"use client";

import { useState, useEffect } from 'react';
import { apiClient, Settings, Article } from '@/lib/api/client';
import {
  Save,
  Globe,
  Mail,
  User,
  Shield,
  Bell,
  Database,
  Palette,
  Layout,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    siteName: '',
    siteDescription: '',
    siteUrl: '',
    siteUrls: [],
    contactEmail: '',
    socialLinks: {
      github: '',
      linkedin: '',
      twitter: '',
      googleScholar: '',
      orcid: '',
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      ogImage: '',
    },
    features: {
      enableComments: false,
      enableAnalytics: false,
      enableNewsletter: false,
      enableRegistration: false,
    },
    aboutArticleId: '',
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  const normalizeSiteUrlValue = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      return null;
    }
  };

  const parseSiteUrls = (value: unknown, primary?: string | null) => {
    const primaryOrigin = normalizeSiteUrlValue(primary || null);
    const rawValues = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[\n,]+/)
        : [];

    const normalized = rawValues
      .map((entry) => normalizeSiteUrlValue(String(entry)))
      .filter((entry): entry is string => !!entry);

    const unique = Array.from(new Set(normalized));
    return primaryOrigin ? unique.filter((entry) => entry !== primaryOrigin) : unique;
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, articlesRes] = await Promise.all([
        apiClient.getSettings(),
        apiClient.getArticles({ limit: 100, status: 'PUBLISHED' })
      ]);

      const sanitizedSettings = {
        ...(settingsRes.data as Settings),
      };

      // Fix corrupted data
      ['siteName', 'siteDescription', 'siteUrl'].forEach(key => {
        const val = (sanitizedSettings as any)[key];
        if (val === '[object Object]' || typeof val === 'object') {
          (sanitizedSettings as any)[key] = '';
        }
      });

      sanitizedSettings.siteUrls = parseSiteUrls(
        (sanitizedSettings as any).siteUrls,
        sanitizedSettings.siteUrl
      );

      // Ensure we merge with defaults
      setSettings({
        ...settings,
        ...sanitizedSettings,
      });

      if (articlesRes.data && articlesRes.data.articles) {
        setArticles(articlesRes.data.articles);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await apiClient.updateSettings(settings);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      if (!currentPassword || !newPassword) {
        setPassMessage({ type: 'error', text: 'Please fill in both fields.' });
        return;
      }
      setPassMessage({ type: '', text: '' });
      await apiClient.updatePassword(currentPassword, newPassword);
      setPassMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  const handleChange = (section: string, field: string, value: any) => {
    setSettings((prev) => {
      // Handle top-level fields
      if (section === 'root') {
        const updated = {
          ...prev,
          [field]: value
        };

        if (field === 'siteUrl') {
          updated.siteUrls = parseSiteUrls(updated.siteUrls, value);
        }

        return updated;
      }
      // Handle nested object fields
      return {
        ...prev,
        [section]: {
          ...(prev[section as keyof Settings] as any),
          [field]: value,
        },
      };
    });
  };

  const handleSiteUrlsChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      siteUrls: parseSiteUrls(value, prev.siteUrl),
    }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value || null,
      },
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setSettings((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature as keyof typeof prev.features],
      },
    }));
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure your blog platform</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => handleChange('root', 'siteName', e.target.value)}
                  placeholder="My Blog"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => handleChange('root', 'siteDescription', e.target.value)}
                  placeholder="A blog about technology and development"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={settings.siteUrl}
                  onChange={(e) => handleChange('root', 'siteUrl', e.target.value)}
                  placeholder="https://yourdomain.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="siteUrls">Additional Domains</Label>
                <Input
                  id="siteUrls"
                  value={(settings.siteUrls || []).join(', ')}
                  onChange={(e) => handleSiteUrlsChange(e.target.value)}
                  placeholder="lefzach.com, lefzach.prof"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Comma-separated domains that should be offered for short links.
                </p>
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => handleChange('root', 'contactEmail', e.target.value)}
                  placeholder="contact@yourdomain.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="aboutArticle">About Page Content</Label>
                <select
                  id="aboutArticle"
                  value={settings.aboutArticleId || ''}
                  onChange={(e) => handleChange('root', 'aboutArticleId', e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select an article for About page...</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a published article to serve as your "About" page content.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Enable Registration</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to sign up
                  </p>
                </div>
                <Button
                  variant={settings.features.enableRegistration ? 'default' : 'outline'}
                  onClick={() => handleFeatureToggle('enableRegistration')}
                >
                  {settings.features.enableRegistration ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Enable Comments</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow users to comment on articles
                  </p>
                </div>
                <Button
                  variant={settings.features.enableComments ? 'default' : 'outline'}
                  onClick={() => handleFeatureToggle('enableComments')}
                >
                  {settings.features.enableComments ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              {/* ... other features ... */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Enable Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track visitor statistics and page views
                  </p>
                </div>
                <Button
                  variant={settings.features.enableAnalytics ? 'default' : 'outline'}
                  onClick={() => handleFeatureToggle('enableAnalytics')}
                >
                  {settings.features.enableAnalytics ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Enable Newsletter</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow users to subscribe to newsletter
                  </p>
                </div>
                <Button
                  variant={settings.features.enableNewsletter ? 'default' : 'outline'}
                  onClick={() => handleFeatureToggle('enableNewsletter')}
                >
                  {settings.features.enableNewsletter ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social Links & SEO ... */}
          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  value={settings.socialLinks.github || ''}
                  onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                  placeholder="https://github.com/username"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={settings.socialLinks.linkedin || ''}
                  onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={settings.socialLinks.twitter || ''}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/username"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="googleScholar">Google Scholar</Label>
                <Input
                  id="googleScholar"
                  value={settings.socialLinks.googleScholar || ''}
                  onChange={(e) => handleSocialLinkChange('googleScholar', e.target.value)}
                  placeholder="https://scholar.google.com/citations?user=ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="orcid">ORCID</Label>
                <Input
                  id="orcid"
                  value={settings.socialLinks.orcid || ''}
                  onChange={(e) => handleSocialLinkChange('orcid', e.target.value)}
                  placeholder="https://orcid.org/0000-0000-0000-0000"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                SEO Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={settings.seo.metaTitle}
                  onChange={(e) => handleChange('seo', 'metaTitle', e.target.value)}
                  placeholder="My Blog - Technology and Development"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Input
                  id="metaDescription"
                  value={settings.seo.metaDescription}
                  onChange={(e) => handleChange('seo', 'metaDescription', e.target.value)}
                  placeholder="A blog about technology and development"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ogImage">Open Graph Image</Label>
                <Input
                  id="ogImage"
                  value={settings.seo.ogImage || ''}
                  onChange={(e) => handleChange('seo', 'ogImage', e.target.value)}
                  placeholder="https://yourdomain.com/og-image.png"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="currentPass">Current Password</Label>
                    <Input
                      id="currentPass"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPass">New Password</Label>
                    <Input
                      id="newPass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  {passMessage.text && (
                    <p className={`text-sm ${passMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                      {passMessage.text}
                    </p>
                  )}
                  <Button onClick={handlePasswordUpdate}>Update Password</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
