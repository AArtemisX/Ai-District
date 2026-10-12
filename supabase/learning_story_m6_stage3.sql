-- Stage 3 content seed only. No schema changes.
insert into public.learning_lessons (code, category, title, summary, content, unlock_order, reward_xp, is_active)
values (
  'ai-ethics-m6-01', 'ethics', 'เมืองที่ AI ตัดสินผิดพลาด',
  'สืบสวนความไม่เป็นธรรมของระบบคัดเลือกผู้สมัคร และออกแบบแนวทาง AI ที่รับผิดชอบ',
  '{"grade":6,"duration":15,"missionType":"story","topics":["AI Bias","Data Bias","Algorithmic Fairness","Transparency","Explainability","Human Oversight","Responsible AI"],"quizReady":false}'::jsonb,
  12, 0, true
)
on conflict (code) do update set
  category=excluded.category,title=excluded.title,summary=excluded.summary,content=excluded.content,
  unlock_order=excluded.unlock_order,reward_xp=excluded.reward_xp,is_active=true;
