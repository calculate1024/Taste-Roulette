// Expo Push Notification service
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

import { supabaseAdmin } from './supabase';
import { getTodayStartUTC8 } from '../utils/date';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

// Send push notifications via Expo Push API
export async function sendPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Expo Push API accepts batches of up to 100
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    const result: any = await res.json();
    tickets.push(...(result.data ?? []));
  }

  return tickets;
}

// Send daily roulette notification to all users with pending cards
export async function sendDailyNotifications(): Promise<number> {
  const todayStart = getTodayStartUTC8();

  // Get all users with push tokens who have a pending card created today
  const { data: pendingCards, error } = await supabaseAdmin
    .from('roulette_cards')
    .select('id, recipient_id, profiles:recipient_id(push_token)')
    .eq('status', 'pending')
    .gte('created_at', todayStart.toISOString());

  if (error) {
    console.error('Failed to fetch pending cards:', error.message);
    return 0;
  }

  if (!pendingCards || pendingCards.length === 0) {
    console.log('No pending cards to notify today');
    return 0;
  }

  const messages: ExpoPushMessage[] = pendingCards
    .filter((card: any) => card.profiles?.push_token)
    .map((card: any) => ({
      to: card.profiles.push_token,
      title: '🎲 Your daily surprise is here!',
      body: 'Someone picked a song just for you. Come discover it.',
      data: { card_id: card.id, type: 'daily_roulette' },
      sound: 'default' as const,
      channelId: 'daily-roulette',
    }));

  if (messages.length === 0) return 0;

  const tickets = await sendPushNotifications(messages);
  const successCount = tickets.filter((t) => t.status === 'ok').length;

  console.log(`Daily notifications: ${successCount}/${messages.length} sent`);
  return successCount;
}

/** Send onboarding reminder to users who signed up 24h+ ago but didn't complete. */
export async function sendOnboardingReminders(): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: users, error } = await supabaseAdmin
    .from('profiles')
    .select('id, push_token')
    .eq('onboarding_completed', false)
    .eq('onboarding_reminder_sent', false)
    .lt('created_at', twentyFourHoursAgo)
    .not('push_token', 'is', null);

  if (error || !users || users.length === 0) return 0;

  const messages: ExpoPushMessage[] = users
    .filter((u: any) => u.push_token)
    .map((u: any) => ({
      to: u.push_token,
      title: '🎲 Your first surprise is waiting!',
      body: 'Complete your taste profile and get your first recommendation.',
      data: { type: 'onboarding_reminder' },
      sound: 'default' as const,
      channelId: 'onboarding',
    }));

  if (messages.length === 0) return 0;

  const tickets = await sendPushNotifications(messages);
  const successCount = tickets.filter((t) => t.status === 'ok').length;

  // Mark reminders as sent
  const userIds = users.map((u: any) => u.id);
  await supabaseAdmin
    .from('profiles')
    .update({ onboarding_reminder_sent: true })
    .in('id', userIds);

  console.log(`Onboarding reminders: ${successCount}/${messages.length} sent`);
  return successCount;
}

/** Send echo notification to recommender when their song gets a 'surprised' reaction. */
export async function sendReactionEcho(
  recommenderId: string,
  trackTitle: string,
  recipientTasteLabel: string
): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('push_token')
    .eq('id', recommenderId)
    .single();

  if (!profile?.push_token) return false;

  const messages: ExpoPushMessage[] = [{
    to: profile.push_token,
    title: '🎉 你的推薦讓人驚喜了！',
    body: `你推薦的「${trackTitle}」讓一位${recipientTasteLabel}感到驚喜！`,
    data: { type: 'reaction_echo' },
    sound: 'default',
    channelId: 'reaction-echo',
  }];

  const tickets = await sendPushNotifications(messages);
  return tickets.length > 0 && tickets[0].status === 'ok';
}
