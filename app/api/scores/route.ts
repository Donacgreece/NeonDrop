import { env } from "cloudflare:workers";

const createSql = `CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, score INTEGER NOT NULL, created_at INTEGER NOT NULL)`;
const indexSql = `CREATE INDEX IF NOT EXISTS scores_rank_idx ON scores (score DESC, created_at ASC)`;

async function topScores() {
  await env.DB.batch([env.DB.prepare(createSql), env.DB.prepare(indexSql)]);
  const result = await env.DB.prepare("SELECT name, score FROM scores ORDER BY score DESC, created_at ASC LIMIT 10").all<{name:string;score:number}>();
  return result.results;
}

export async function GET() {
  try { return Response.json({ scores: await topScores() }); }
  catch { return Response.json({ scores: [] }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {name?:string;score?:number};
    const name=(body.name||"PLAYER").toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,12)||"PLAYER";
    const score=Math.floor(Number(body.score));
    if(!Number.isFinite(score)||score<0||score>10000) return Response.json({error:"Invalid score"},{status:400});
    await env.DB.prepare(createSql).run(); await env.DB.prepare(indexSql).run();
    await env.DB.prepare("INSERT INTO scores (name, score, created_at) VALUES (?, ?, ?)").bind(name,score,Date.now()).run();
    return Response.json({scores:await topScores()});
  } catch { return Response.json({error:"Score service unavailable"},{status:503}); }
}
