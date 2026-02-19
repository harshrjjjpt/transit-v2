CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age INTEGER NOT NULL,
  commute_start_station TEXT NOT NULL,
  commute_start_time TEXT NOT NULL,
  commute_end_station TEXT NOT NULL,
  commute_end_time TEXT NOT NULL,
  return_start_station TEXT NOT NULL,
  return_start_time TEXT NOT NULL,
  return_end_station TEXT NOT NULL,
  return_end_time TEXT NOT NULL,
  hobbies TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  topics_to_discuss TEXT[] NOT NULL DEFAULT '{}',
  job TEXT,
  school_or_college TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS commute_start_time TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS commute_end_time TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS return_start_station TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS return_start_time TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS return_end_station TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS return_end_time TEXT NOT NULL DEFAULT '19:00';

CREATE INDEX IF NOT EXISTS idx_user_profiles_commute
  ON user_profiles (commute_start_station, commute_end_station);
