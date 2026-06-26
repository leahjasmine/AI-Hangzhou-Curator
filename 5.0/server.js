require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const AI_API_URL = process.env.AI_API_URL || 'https://api.deepseek.com/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const localReplies = {
  route: '已为你生成一条杭州灵感路线：上午从西湖湖滨出发，沿白堤慢行至孤山；午后前往龙井茶园体验茶文化；傍晚到京杭大运河畔看城市灯影。建议预算 120-220 元，适合轻松拍照与文化体验。',
  citywalk: '推荐 Citywalk：武林门码头 → 小河直街 → 拱宸桥 → 桥西历史文化街区。全程约 2.5 小时，适合喜欢运河、老街、咖啡与手作店的同学。',
  qa: '杭州的文旅气质可以概括为“山水、宋韵、茶事、运河与年轻城市生活”。西湖代表山水审美，良渚代表文明源流，运河代表城市商业与生活记忆。你可以继续追问某个景点、历史典故或路线建议。',
  card: '灵感卡片：西湖晨雾｜关键词：湖面、远山、慢行、宋韵。适合玩法：清晨散步、拍照、湖边咖啡、手账记录。',
};

function getLocalReply(type, prompt, language = 'zh') {
  if (language === 'en') {
    return `Local demo mode. Your input: "${prompt || 'No input'}". Suggested Hangzhou plan: explore West Lake, Longjing tea fields, the Grand Canal, and a student-friendly Citywalk route based on your time, budget, and mood.`;
  }

  const prefix = prompt ? `你输入的是：“${prompt}”。\n` : '';
  return `${prefix}${localReplies[type] || localReplies.qa}\n\n提示：当前为本地演示模式；如果要接入真实 AI，请在 .env 中填写 AI_API_KEY。`;
}

function getSystemPrompt(language) {
  if (language === 'en') {
    return 'You are an AI Hangzhou cultural tourism curator. Answer in English. Give practical, structured, student-friendly travel suggestions.';
  }

  return '你是 AI 杭州文旅策展人。请用中文回答，围绕杭州智慧文旅，给出结构清晰、适合大学生、本地居民和游客实际执行的建议。回答要包含具体地点、路线、文化解释或玩法建议，避免空泛。';
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: process.env.AI_API_KEY ? 'remote-ai-ready' : 'local-demo',
    model: AI_MODEL,
    apiUrl: AI_API_URL,
  });
});

app.get('/generated/hangzhou_ai_cultural_tourism_dynamic_hero.mp4', (req, res) => {
  res.sendFile(path.join(__dirname, 'hangzhou_ai_cultural_tourism_dynamic_hero.mp4'));
});

app.post('/api/ai', async (req, res) => {
  const { type = 'qa', prompt = '', language = 'zh' } = req.body || {};
  const safePrompt = String(prompt || '').trim();

  if (!process.env.AI_API_KEY) {
    return res.json({
      ok: true,
      mode: 'local-demo',
      answer: getLocalReply(type, safePrompt, language),
    });
  }

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(language),
          },
          {
            role: 'user',
            content: `功能类型：${type}\n用户需求：${safePrompt || '请给我一个杭州文旅建议。'}`,
          },
        ],
        temperature: 0.8,
      }),
    });

    const rawText = await response.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        mode: 'remote-ai-error',
        answer: getLocalReply(type, safePrompt, language),
        error: data.error?.message || data.message || rawText || `AI service error: ${response.status}`,
      });
    }

    res.json({
      ok: true,
      mode: 'remote-ai',
      answer: data.choices?.[0]?.message?.content || data.output_text || getLocalReply(type, safePrompt, language),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mode: 'server-fallback',
      answer: getLocalReply(type, safePrompt, language),
      error: error.message,
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI杭州文旅策展人已启动：http://localhost:${PORT}`);
  console.log(`AI模式：${process.env.AI_API_KEY ? `远程模型 ${AI_MODEL}` : '本地演示模式'}`);
});
