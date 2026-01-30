import Link from 'next/link';
import { Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
}

interface AdminArticleListProps {
  articles: Article[];
  onDelete: (id: string) => void;
}

export function AdminArticleList({ articles, onDelete }: AdminArticleListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'REVIEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Articles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1">
                <h3 className="font-semibold">{article.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Badge className={getStatusColor(article.status)}>
                    {article.status}
                  </Badge>
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/blog/${article.slug}`} target="_blank">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/admin/articles/${article.id}/edit`}>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(article.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
