const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { pool } = require('./db')

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase()
    cb(null, `${Date.now()}-${safeName}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    return res.status(200).json({ status: 'ok', database: 'connected' })
  } catch (error) {
    return res.status(500).json({ status: 'error', database: 'disconnected', message: error.message })
  }
})

app.post('/api/users/profile', upload.single('profilePic'), async (req, res) => {
  const {
    email,
    name,
    gender,
    age,
    commuteStartStation,
    commuteStartTime,
    commuteEndStation,
    commuteEndTime,
    returnStartStation,
    returnStartTime,
    returnEndStation,
    returnEndTime,
    hobbies,
    interests,
    topicsToDiscuss,
    job,
    schoolOrCollege,
  } = req.body

  if (
    !email ||
    !name ||
    !gender ||
    !age ||
    !commuteStartStation ||
    !commuteStartTime ||
    !commuteEndStation ||
    !commuteEndTime ||
    !returnStartStation ||
    !returnStartTime ||
    !returnEndStation ||
    !returnEndTime
  ) {
    return res.status(400).json({ message: 'Missing required fields.' })
  }

  const parseArray = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const hobbiesArray = parseArray(hobbies)
  const interestsArray = parseArray(interests)
  const topicsArray = parseArray(topicsToDiscuss)

  const numericAge = Number(age)
  if (Number.isNaN(numericAge) || numericAge < 10 || numericAge > 120) {
    return res.status(400).json({ message: 'Age must be a valid number between 10 and 120.' })
  }

  const profilePicUrl = req.file ? `/uploads/${req.file.filename}` : null

  try {
    const query = `
      INSERT INTO user_profiles (
        email, name, gender, age,
        commute_start_station, commute_start_time,
        commute_end_station, commute_end_time,
        return_start_station, return_start_time,
        return_end_station, return_end_time,
        hobbies, interests, topics_to_discuss,
        job, school_or_college, profile_pic_url
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,$8,
        $9,$10,
        $11,$12,
        $13::text[],$14::text[],$15::text[],
        $16,$17,$18
      )
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        commute_start_station = EXCLUDED.commute_start_station,
        commute_start_time = EXCLUDED.commute_start_time,
        commute_end_station = EXCLUDED.commute_end_station,
        commute_end_time = EXCLUDED.commute_end_time,
        return_start_station = EXCLUDED.return_start_station,
        return_start_time = EXCLUDED.return_start_time,
        return_end_station = EXCLUDED.return_end_station,
        return_end_time = EXCLUDED.return_end_time,
        hobbies = EXCLUDED.hobbies,
        interests = EXCLUDED.interests,
        topics_to_discuss = EXCLUDED.topics_to_discuss,
        job = EXCLUDED.job,
        school_or_college = EXCLUDED.school_or_college,
        profile_pic_url = COALESCE(EXCLUDED.profile_pic_url, user_profiles.profile_pic_url),
        updated_at = NOW()
      RETURNING *
    `

    const values = [
      email.toLowerCase(),
      name,
      gender,
      numericAge,
      commuteStartStation,
      commuteStartTime,
      commuteEndStation,
      commuteEndTime,
      returnStartStation,
      returnStartTime,
      returnEndStation,
      returnEndTime,
      hobbiesArray,
      interestsArray,
      topicsArray,
      job || null,
      schoolOrCollege || null,
      profilePicUrl,
    ]

    const result = await pool.query(query, values)
    return res.status(201).json({ message: 'Profile saved successfully.', profile: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save profile.', error: error.message })
  }
})

app.get('/api/users/profile/:email', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_profiles WHERE email = $1', [req.params.email.toLowerCase()])
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Profile not found.' })
    }
    return res.json(result.rows[0])
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile.', error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`)
})
