import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
    
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'YouTube API key not configured',
          subscriberCount: '999K+' // fallback value
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // قناة اكس دريم - استخراج معرف القناة من الرابط
    const channelHandle = 'xdreemb52'
    
    // أولاً نحصل على معرف القناة من الـ handle
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelHandle}&key=${YOUTUBE_API_KEY}`
    
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()
    
    if (!searchData.items || searchData.items.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Channel not found',
          subscriberCount: '999K+' // fallback value
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const channelId = searchData.items[0].snippet.channelId
    
    // الآن نحصل على إحصائيات القناة
    const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
    
    const statsResponse = await fetch(statsUrl)
    const statsData = await statsResponse.json()
    
    if (!statsData.items || statsData.items.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Channel stats not found',
          subscriberCount: '999K+' // fallback value
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const subscriberCount = statsData.items[0].statistics.subscriberCount
    
    // تنسيق العدد (مثل 1.2M، 150K)
    const formatSubscriberCount = (count: string) => {
      const num = parseInt(count)
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      return count
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscriberCount: formatSubscriberCount(subscriberCount),
        rawCount: subscriberCount,
        channelId,
        channelHandle 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error fetching YouTube stats:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        subscriberCount: '999K+' // fallback value
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})