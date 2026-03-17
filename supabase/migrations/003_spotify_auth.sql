-- Add Spotify OAuth columns to profiles
ALTER TABLE profiles ADD COLUMN spotify_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN spotify_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN spotify_display_name TEXT;
