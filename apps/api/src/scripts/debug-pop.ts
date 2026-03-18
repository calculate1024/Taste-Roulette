import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Direct Spotify API call to see raw response
async function getToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

async function main() {
  const token = await getToken();

  // Raw search with market=US
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent('Taylor Swift')}&type=track&limit=3&market=US`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  console.log('=== Raw Spotify response (first track) ===');
  const t = data.tracks.items[0];
  console.log('name:', t.name);
  console.log('popularity:', t.popularity);
  console.log('artist:', t.artists[0].name);
  console.log('typeof popularity:', typeof t.popularity);

  console.log('\n=== Without market (default) ===');
  const res2 = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent('Taylor Swift')}&type=track&limit=3`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data2 = await res2.json();
  for (const track of data2.tracks.items) {
    console.log(`${track.name} | pop: ${track.popularity}`);
  }
}

main().catch(console.error);
