# 🎓 EduBuddy: Free Learning for Every Student

A free AI study buddy for students who cannot afford tuition or coaching.
Built for the PromptWars hackathon by Hack2skill.

**Live demo:** https://edubuddy-edubuddy.vercel.app

## Features
- Simple explanations matched to the student's level (Beginner, School, College)
- Fun analogies from everyday Indian life
- 5-question quizzes with explanations
- Free 5-day study plans for students with only a phone
- English, Hindi and Hinglish, with read-aloud and copy
- Accessible: keyboard friendly, labelled controls, screen reader support

## Tech stack
Gemini API, JavaScript, Vercel serverless functions, GitHub

## Run tests
    npm test

## Setup
1. Add `GEMINI_API_KEY` as an environment variable in Vercel.
2. Deploy. The API key stays on the server and is never exposed to the browser.

## Project structure
- `index.html`: user interface
- `api/ask.js`: serverless function (model fallback, caching, validation)
- `lib/prompts.js`: prompt building and input validation
- `tests/`: automated tests