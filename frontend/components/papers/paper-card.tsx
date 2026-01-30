import Link from 'next/link';
import { FileText, Quote, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface PaperCardProps {
  paper: {
    id: string;
    title: string;
    authors: string;
    venue?: string;
    year: number;
    citations: number;
    type: string;
    doi?: string;
  };
}

export function PaperCard({ paper }: PaperCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'JOURNAL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CONFERENCE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PREPRINT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'THESIS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge className={getTypeColor(paper.type)}>{paper.type}</Badge>
          <span className="text-sm text-muted-foreground">{paper.year}</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
            <Quote className="h-4 w-4" />
            <span>{paper.citations} citations</span>
          </div>
        </div>
        <CardTitle className="text-lg">{paper.title}</CardTitle>
        <CardDescription className="text-sm">
          {paper.authors}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paper.venue && (
          <p className="text-sm text-muted-foreground mb-2">{paper.venue}</p>
        )}
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on DOI
          </a>
        )}
      </CardContent>
    </Card>
  );
}
