# 🎓 EduBuddy – Student Learning Assistant
AI-powered learning platform that simplifies difficult concepts for students at their own understanding level.

## Features
- 3 understanding levels: Beginner / School / College
- Simple explanations, fun Indian-life analogies, interactive quizzes, 5-day study plans
- Powered by Google Gemini API via secure Vercel serverless function

## Tech
HTML/CSS/JS + Vercel Serverless (Node) + Gemini 2.5 Flash

## Run locally
1. `npm i -g vercel`
2. Create `.env` with `GEMINI_API_KEY=your_key`
3. `vercel dev`

## Deploy
Push to GitHub → Import in Vercel → add env var `GEMINI_API_KEY`.
