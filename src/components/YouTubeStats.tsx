import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Youtube, Users, Play, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import xdreamLogo from '@/assets/xdream-logo.jpg';

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
    <Card className="bg-gradient-to-br from-purple-500/15 via-blue-500/10 to-red-500/15 border-purple-300/30 hover:border-purple-400/50 transition-all duration-300 shadow-lg backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* صورة القناة */}
          <div className="relative">
            <img 
              src={xdreamLogo} 
              alt="اكس دريم لوجو" 
              className="w-16 h-16 rounded-full border-2 border-purple-400/30 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Play className="h-2.5 w-2.5" fill="currentColor" />
              LIVE
            </div>
          </div>
          
          {/* معلومات القناة */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-xl text-white drop-shadow-lg">
                🎮 اكس دريم
              </h3>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                <Youtube className="h-3 w-3 mr-1" />
                VERIFIED
              </Badge>
            </div>
            <p className="text-sm text-white/90 mb-2">
              🎯 قناة الألعاب العربية الأولى | Gaming Content Creator
            </p>
            
            {/* الإحصائيات */}
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Users className="h-3 w-3 text-red-400" />
                <span className="text-white font-semibold">
                  {loading ? '...' : stats.subscriberCount}
                </span>
                <span className="text-white/80">مشترك</span>
              </div>
              
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Heart className="h-3 w-3 text-pink-400" />
                <span className="text-white font-semibold">10M+</span>
                <span className="text-white/80">إعجاب</span>
              </div>
              
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Play className="h-3 w-3 text-green-400" />
                <span className="text-white font-semibold">500+</span>
                <span className="text-white/80">فيديو</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* رابط القناة */}
        <div className="mt-4 pt-3 border-t border-white/20">
          <a 
            href="https://youtube.com/@xdreemb52"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Youtube className="h-4 w-4" />
            🔔 اشترك في القناة
          </a>
        </div>
      </CardContent>
    </Card>
  );
};