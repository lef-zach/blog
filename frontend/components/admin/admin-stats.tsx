import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FileText, Users, Eye, Activity } from 'lucide-react';

interface AdminStatsProps {
  stats: {
    totalArticles: number;
    totalPapers: number;
    totalViews: number;
    activeUsers: number;
  };
}

export function AdminStats({ stats }: AdminStatsProps) {
  const statCards = [
    {
      title: 'Total Articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Total Papers',
      value: stats.totalPapers,
      icon: FileText,
      color: 'text-green-600',
    },
    {
      title: 'Total Views',
      value: stats.totalViews,
      icon: Eye,
      color: 'text-purple-600',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: Users,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
