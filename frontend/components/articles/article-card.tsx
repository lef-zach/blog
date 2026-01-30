import Link from 'next/link';
import { Calendar, Clock, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    publishedAt: string;
    readingTime: number;
    author: {
      name: string;
    };
    category?: {
      name: string;
    };
    tags?: Array<{
      name: string;
    }>;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          {article.category && (
            <Badge variant="secondary">{article.category.name}</Badge>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {date}
          </div>
        </div>
        <CardTitle>
          <Link href={`/blog/${article.slug}`} className="hover:text-primary">
            {article.title}
          </Link>
        </CardTitle>
        <CardDescription>{article.excerpt}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{article.author.name}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{article.readingTime} min read</span>
          </div>
        </div>
        {article.tags && article.tags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {article.tags.map((tag) => (
              <Badge key={tag.name} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
