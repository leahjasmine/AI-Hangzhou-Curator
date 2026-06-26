require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const localReplies = {
  route: '已为你生成一条杭州灵感路线：上午从西湖湖滨出发，沿白堤慢行至孤山；午后前往龙井茶园体验茶文化；傍晚到京杭大运河畔看城市灯影。建议预算 120-220 元，适合轻松拍照与文化体验。',
  citywalk: '推荐 Citywalk：武林门码头 → 小河直街 → 拱宸桥 → 桥西历史文化街区。全程约 2.5 小时，适合喜欢运河、老街、咖啡与手作店的同学。',
  qa: '杭州的文旅气质可以概括为“山水、宋韵、茶事、运河与年轻城市生活”。如果你想了解某个景点，我可以继续给你讲历史背景和游玩建议。',
  card: '灵感卡片：西湖晨雾｜关键词：湖面、远山、慢行、宋韵。适合玩法：清晨散步、拍照、湖边咖啡、手账记录。',
};

function getLocalReply(type, prompt) {
  const prefix = prompt ? `你输入的是：“${prompt}”。` : '';
  return `${prefix}${localReplies[type] || localReplies.qa}`;
}

app.post('/api/ai', async (req, res) => {
  const { type = 'qa', prompt = '', language = 'zh' } = req.body || {};

  if (!process.env.AI_API_KEY) {
    return res.json({
      mode: 'local-demo',
      answer: getLocalReply(type, prompt),
    });
  }

  try {
    const response = await fetch(process.env.AI_API_URL || 'https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: language === 'en'
              ? 'You are an AI Hangzhou cultural tourism curator. Give concise, practical travel suggestions in English.'
              : '你是 AI 杭州文旅策展人，请用中文给出简洁、实用、有审美感的杭州文旅建议。',
          },
          {
            role: 'user',
            content: `功能类型：${type}\n用户需求：${prompt}`,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    res.json({
      mode: 'remote-ai',
      answer: data.choices?.[0]?.message?.content || getLocalReply(type, prompt),
    });
  } catch (error) {
    res.json({
      mode: 'fallback',
      answer: getLocalReply(type, prompt),
      error: error.message,
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI杭州文旅策展人已启动：http://localhost:${PORT}`);
});
