import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// إعدادات CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// دالة لتنسيق الأعداد
function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// دالة للحصول على عدد المشتركين من YouTube Data API
async function getYouTubeSubscriberCount(channelId: string, apiKey: string): Promise<string> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn("YouTube API returned non-OK status:", res.status);
      return "N/A";
    }

    const data = await res.json();
    const count = data.items?.[0]?.statistics?.subscriberCount;

    return count ? formatCount(Number(count)) : "N/A";
  } catch (error) {
    console.error("Error fetching subscriber count:", error);
    return "N/A";
  }
}

// دالة لإنشاء استجابة JSON
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// إعدادات القناة و API Key
const channelId = "UCx4ZTHHI-INbMCtqJKUaljg";
const channelHandle = "xdreemb52";
const apiKey = "AIzaSyBt3o2l9-0b-HnsaZlwK1wTszwTxQbfUCU"; // الـ API Key الخاص بك

// بدء السيرفر
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const subscriberCount = await getYouTubeSubscriberCount(channelId, apiKey);

  return jsonResponse({
    success: true,
    channelId,
    channelHandle,
    subscriberCount,
    source: "youtube-api",
  });
});
