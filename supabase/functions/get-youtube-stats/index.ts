import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// إعدادات CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// دالة لتنسيق الأعداد (عدد المشتركين)
function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// دالة للحصول على عدد المشتركين من LiveCounts.io
async function getLiveSubscriberCount(channelId: string): Promise<string> {
  try {
    const url = `https://livecounts.io/api/youtube-live-subscriber-count/${channelId}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      console.warn("LiveCounts API returned non-OK status:", response.status);
      return "N/A";
    }

    const data = await response.json();
    const count = data?.subscriberCount;

    if (typeof count === "number") {
      return formatCount(count);
    } else {
      console.warn("LiveCounts response missing subscriberCount:", data);
      return "N/A";
    }
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

// بدء السيرفر
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const channelId = "UCx4ZTHHI-INbMCtqJKUaljg";
  const channelHandle = "xdreemb52";

  const subscriberCount = await getLiveSubscriberCount(channelId);

  return jsonResponse({
    success: true,
    channelId,
    channelHandle,
    subscriberCount,
    source: "livecounts",
  });
});
