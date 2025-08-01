import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Youtube, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeStatsData {
  success?: boolean;
  subscriberCount: string;
  rawCount?: string;
  channelHandle?: string;
  error?: string;
}

export const YouTubeStats = () => {
  const [stats, setStats] = useState<YouTubeStatsData>({ subscriberCount: '999K+' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-youtube-stats');
        
        if (error) {
          console.error('Error fetching YouTube stats:', error);
          setStats({ subscriberCount: '999K+', error: 'Failed to fetch stats' });
        } else {
          setStats(data || { subscriberCount: '999K+' });
        }
      } catch (error) {
        console.error('Error calling function:', error);
        setStats({ subscriberCount: '999K+', error: 'Connection error' });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Card className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-300/20 hover:border-red-400/30 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2 bg-red-500/20 rounded-full">
              <Youtube className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                اكس دريم
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gaming Channel
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-300/30">
              <Users className="h-3 w-3 ml-1" />
              {loading ? '...' : stats.subscriberCount}
            </Badge>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              مشترك
            </p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-red-200/30">
          <a 
            href="https://youtube.com/@xdreemb52"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors inline-flex items-center gap-1"
          >
            <Youtube className="h-3 w-3" />
            زيارة القناة
          </a>
        </div>
      </CardContent>
    </Card>
  );
};