import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('https://hwnjqpdlwzkyrgxybsjt.supabase.co') ?? '',
      Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bmpxcGRsd3preXJneHlic2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjI4NDgsImV4cCI6MjA2OTYzODg0OH0.-FutvUNh8MJ-zxIrCJy14lduMsxa4ji5EpybdQE3L_M') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // احسب الأوقات للتنظيف
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // نتائج التنظيف
    const results: any = {};

    // تنظيف غرف السلم والثعبان
    results.snakes_ladders_rooms = await cleanupTable(
      supabaseClient, 
      'snakes_ladders_rooms',
      fourHoursAgo,
      twelveHoursAgo,
      twentyFourHoursAgo
    );

    // تنظيف غرف XO (إذا كان الجدول موجوداً)
    results.tic_tac_toe_rooms = await cleanupTable(
      supabaseClient, 
      'tic_tac_toe_rooms',
      fourHoursAgo,
      twelveHoursAgo,
      twentyFourHoursAgo
    );

    // تنظيف الغرف العامة (إذا كان الجدول موجوداً)
    results.game_rooms = await cleanupTable(
      supabaseClient, 
      'game_rooms',
      fourHoursAgo,
      twelveHoursAgo,
      twentyFourHoursAgo
    );

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed successfully',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// دالة مساعدة لتنظيف أي جدول
async function cleanupTable(
  supabaseClient: any,
  tableName: string,
  fourHoursAgo: Date,
  twelveHoursAgo: Date,
  twentyFourHoursAgo: Date
) {
  const result: any = {};

  try {
    // 1. احذف الغرف الفارغة منذ أكثر من 4 ساعات
    const { count: emptyCount, error: emptyError } = await supabaseClient
      .from(tableName)
      .delete()
      .lt('last_activity_at', fourHoursAgo.toISOString())
      .is('player2_id', null)
      .is('player3_id', null)
      .is('player4_id', null);

    result.empty_rooms_deleted = emptyCount || 0;
    if (emptyError) result.empty_error = emptyError.message;

    // 2. احذف الغرف المنتهية منذ أكثر من 24 ساعة
    const { count: finishedCount, error: finishedError } = await supabaseClient
      .from(tableName)
      .delete()
      .lt('last_activity_at', twentyFourHoursAgo.toISOString())
      .eq('game_status', 'finished');

    result.finished_rooms_deleted = finishedCount || 0;
    if (finishedError) result.finished_error = finishedError.message;

    // 3. احذف الغرف الخاملة منذ أكثر من 12 ساعة
    const { count: inactiveCount, error: inactiveError } = await supabaseClient
      .from(tableName)
      .delete()
      .lt('last_activity_at', twelveHoursAgo.toISOString())
      .neq('game_status', 'finished');

    result.inactive_rooms_deleted = inactiveCount || 0;
    if (inactiveError) result.inactive_error = inactiveError.message;

  } catch (error) {
    result.error = error.message;
  }

  return result;
}
