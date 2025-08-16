import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Youtube, Users, Play, Heart } from 'lucide-react';

interface YouTubeStatsData {
  subscriberCount: string;
  error?: string;
}

const channelId = "UCx4ZTHHI-INbMCtqJKUaljg";
const apiKey = "AIzaSyBt3o2l9-0b-HnsaZlwK1wTszwTxQbfUCU"; // ضع API Key الخاص بك هنا

export const YouTubeStats = () => {
  const [stats, setStats] = useState<YouTubeStatsData>({ subscriberCount: '34.4K' });
  const [loading, setLoading] = useState(true);

  // دالة لتنسيق العدد
  const formatCount = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`);
        const data = await res.json();

        const count = data.items?.[0]?.statistics?.subscriberCount;
        if (count) {
          setStats({ subscriberCount: formatCount(Number(count)) });
        } else {
          setStats({ subscriberCount: 'N/A', error: 'Unable to fetch count' });
        }
      } catch (error) {
        console.error('Error fetching YouTube stats:', error);
        setStats({ subscriberCount: 'N/A', error: 'Connection error' });
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
          <div className="relative">
            <img 
              src="/lovable-uploads/7d6bcbf7-d370-49f3-9130-a8118efd3188.png" 
              alt="XDreemB52 لوجو" 
              className="w-16 h-16 rounded-full border-2 border-yellow-400/50 shadow-lg object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Play className="h-2.5 w-2.5" fill="currentColor" />
              LIVE
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-xl text-white drop-shadow-lg">
                XDreemB52 | دريم
              </h3>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30 text-xs">
                <Youtube className="h-3 w-3 mr-1" />
                ✓
              </Badge>
            </div>
            <p className="text-sm text-white/90 mb-2">
              🕌 مهند | 22 سنة | 🇸🇦 سعودي | قريب مكة
            </p>
            <p className="text-xs text-white/70 mb-2">
              Epic: iXDreemB52 | Steam: iXDreemB52 | Code: XDB52
            </p>
            
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Users className="h-3 w-3 text-red-400" />
                <span className="text-white font-semibold">
                  {loading ? '...' : stats.subscriberCount}
                </span>
                <span className="text-white/80">مشترك</span>
              </div>
              
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Play className="h-3 w-3 text-green-400" />
                <span className="text-white font-semibold">534</span>
                <span className="text-white/80">فيديو</span>
              </div>
              
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Heart className="h-3 w-3 text-pink-400" />
                <span className="text-white font-semibold">1K+</span>
                <span className="text-white/80">إعجاب</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
          <div className="flex gap-2">
            <a 
              href="https://youtube.com/@xdreemb52"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
            >
              <Youtube className="h-3 w-3" />
              اشترك
            </a>
            <a 
              href="https://lnk.bio/XDreemB52"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
            >
              🔗 جميع الروابط
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
